#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
mod scan;
mod window_style;

use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use scan::PartialScanState;
use std::process::Command;
use std::sync::Mutex;
use sysinfo::{DiskExt, System, SystemExt};
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;

#[cfg(target_os = "macos")]
use window_vibrancy::NSVisualEffectMaterial;

#[cfg(target_os = "linux")]
use std::fs::metadata;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TamiaDisk<'a> {
    name: &'a str,
    s_mount_point: String,
    total_space: u64,
    available_space: u64,
    is_removable: bool,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .manage(MyState(Default::default()))
        .manage(PartialScanState(Default::default()))
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();
            // window.open_devtools();
            #[cfg(target_os = "macos")]
            window_vibrancy::apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("Error applying blurred bg");

            #[cfg(target_os = "windows")]
            window_vibrancy::apply_blur(&window, Some((18, 18, 18, 125)))
                .expect("Error applying blurred bg");

            #[cfg(any(target_os = "windows", target_os = "macos"))]
            window_style::set_window_styles(&window).unwrap();

            // app.listen_global("scan_stop", |event| {
            //     let s = app.state::<MyState>();
            //     s.0.lock().unwrap().take().unwrap().kill();
            // });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_disks,
            start_scanning,
            stop_scanning,
            show_in_folder,
            open_in_os,
            move_to_trash,
            get_trash_path,
            empty_trash,
            restore_from_trash,
            refresh_folder,
            stop_refresh_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn open_in_os(path: String) {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .unwrap();
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open").arg(&path).spawn().unwrap();
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(&path).spawn().unwrap();
    }
}

#[tauri::command]
fn show_in_folder(path: String) {
    #[cfg(target_os = "windows")]
    {
        use regex::Regex;
        let re = Regex::new(r"/").unwrap();
        let result = re.replace_all(&path, "\\");
        Command::new("explorer")
            .args(["/select,", format!("{}", result).as_str()]) // The comma after select is not a typo
            .spawn()
            .unwrap();
    }

    #[cfg(target_os = "linux")]
    {
        // if path.contains(",") {
        // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
        let new_path = match metadata(&path).unwrap().is_dir() {
            true => path,
            false => {
                let mut path2 = PathBuf::from(path);
                path2.pop();
                path2.into_os_string().into_string().unwrap()
            }
        };
        Command::new("xdg-open").arg(&new_path).spawn().unwrap();
        // } else {
        //     Command::new("dbus-send")
        //         .args([
        //             "--session",
        //             "--dest=org.freedesktop.FileManager1",
        //             "--type=method_call",
        //             "/org/freedesktop/FileManager1",
        //             "org.freedesktop.FileManager1.ShowItems",
        //             format!("array:string:\"file://{path}\"").as_str(),
        //             "string:\"\"",
        //         ])
        //         .spawn()
        //         .unwrap();
        // }
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open").args(["-R", &path]).spawn().unwrap();
    }
}
#[tauri::command]
fn move_to_trash(path: String) -> Result<(), String> {
    eprintln!("[trash] move_to_trash called with path: {:?}", &path);
    if path.trim().is_empty() {
        eprintln!("[trash] ERROR: empty path received");
        return Err("Cannot move to trash: path is empty (no treemap node selected)".into());
    }
    match trash::delete(&path) {
        Ok(()) => {
            eprintln!("[trash] move_to_trash succeeded for: {:?}", &path);
            Ok(())
        }
        Err(e) => {
            eprintln!("[trash] move_to_trash FAILED for {:?}: {}", &path, e);
            Err(e.to_string())
        }
    }
}

/// Get the platform-dependent trash folder path for a given mount point/disk.
#[tauri::command]
fn get_trash_path(disk_mount_point: String) -> Result<String, String> {
    println!("[trash] get_trash_path: disk_mount_point={}", &disk_mount_point);
    let trash_dir = get_trash_directory(&disk_mount_point)?;
    println!("[trash] get_trash_path result: {}", &trash_dir);
    Ok(trash_dir)
}

/// Get the trash directory path for a given disk/mount point.
fn get_trash_directory(_mount_point: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, the recycle bin is per-drive, so we use $Recycle.Bin
        let drive_letter = mount_point.split(':').next().unwrap_or("C");
        Ok(format!("{}\\$Recycle.Bin", drive_letter))
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, trash is ~/Trash for each mounted volume
        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
        let trash_path = format!("{}/.Trash/{}", home_dir.display(), mount_point.trim_matches('/'));
        Ok(trash_path)
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, trash is unified at ~/.local/share/Trash/ (not per-mount-point)
        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
        Ok(format!("{}/.local/share/Trash", home_dir.display()))
    }
}

/// Empty the trash for a given disk/mount point.
#[tauri::command]
fn empty_trash(disk_mount_point: String) -> Result<(), String> {
    println!("[trash] empty_trash: disk_mount_point={}", &disk_mount_point);
    let trash_dir = get_trash_directory(&disk_mount_point)?;
    println!("[trash] empty_trash trash_dir={}", &trash_dir);
    let path = PathBuf::from(&trash_dir);

    if !path.exists() {
        println!("[trash] empty_trash: trash dir does not exist, skipping");
        return Ok(());
    }

    // Use the trash crate to empty, or fall back to recursive delete
    #[cfg(target_os = "linux")]
    {
        // On Linux, trash has two subdirs: files/ and info/
        let trash_files = path.join("files");
        let trash_info = path.join("info");

        if trash_files.is_dir() {
            for entry in fs::read_dir(&trash_files).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let file_path = entry.path();
                let name = file_path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                // Remove corresponding .trashinfo from info/
                let trashinfo_path = trash_info.join(format!("{}.trashinfo", name));
                if trashinfo_path.exists() {
                    fs::remove_file(&trashinfo_path).ok();
                }
                if file_path.is_dir() {
                    fs::remove_dir_all(&file_path).map_err(|e| e.to_string())?;
                } else {
                    fs::remove_file(&file_path).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if path.is_dir() {
            for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let file_path = entry.path();
                if file_path.is_dir() {
                    fs::remove_dir_all(&file_path).map_err(|e| e.to_string())?;
                } else {
                    fs::remove_file(&file_path).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if path.is_dir() {
            for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let file_path = entry.path();
                if file_path.is_dir() {
                    fs::remove_dir_all(&file_path).map_err(|e| e.to_string())?;
                } else {
                    fs::remove_file(&file_path).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    Ok(())
}

/// Restore a single trashed item back to its original location.
#[tauri::command]
fn restore_from_trash(
    disk_mount_point: String,
    trash_item_path: String,
) -> Result<(), String> {
    println!("[trash] restore_from_trash: disk_mount_point={}, trash_item_path={}", &disk_mount_point, &trash_item_path);
    let trash_dir = get_trash_directory(&disk_mount_point)?;
    println!("[trash] restore_from_trash trash_dir={}", &trash_dir);

    #[cfg(target_os = "linux")]
    {
        // On Linux, trash items are in ~/.local/share/Trash/files/<name>
        // and metadata is in ~/.local/share/Trash/info/<name>.trashinfo
        let files_dir = PathBuf::from(&trash_dir).join("files");
        let info_dir = PathBuf::from(&trash_dir).join("info");

        // The trash_item_path is the full path to the item in files/
        let file_name = trash_item_path.split('/').last().unwrap_or("");
        let trash_full_path = files_dir.join(file_name);
        let trashinfo_path = info_dir.join(format!("{}.trashinfo", file_name));

        let original_path = if trashinfo_path.exists() {
            let content = fs::read_to_string(&trashinfo_path).map_err(|e| e.to_string())?;
            parse_trashinfo_original_path(&content)
        } else {
            // Fallback: restore to mount point root
            format!("/{}/{}", disk_mount_point.trim_matches('/'), file_name)
        };

        let dest = PathBuf::from(&original_path);
        let parent = dest.parent().ok_or("Invalid destination path")?;
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;

        fs::rename(&trash_full_path, &dest).map_err(|e| {
            format!("Failed to restore {}: {}", trash_item_path, e)
        })?;

        // Remove .trashinfo file
        if trashinfo_path.exists() {
            fs::remove_file(&trashinfo_path).ok();
        }
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, we use the shell recycle bin structure.
        // The items are in $Recycle.Bin with S-xxx U-xxx naming.
        // We'll move them back to the root of the drive.
        let item_name = trash_item_path.split('/').last().unwrap_or("restored");
        let dest = PathBuf::from(format!("{}\\{}", disk_mount_point, item_name));

        let trash_full_path = PathBuf::from(&trash_dir).join(item_name);

        if !dest.exists() {
            fs::rename(&trash_full_path, &dest).map_err(|e| {
                format!("Failed to restore {}: {}", trash_item_path, e)
            })?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, items in ~/.Trash/<mount_point> were originally at the mount point root
        let item_name = trash_item_path.split('/').last().unwrap_or("restored");
        let dest = PathBuf::from(format!("{}/{}", disk_mount_point.trim_matches('/'), item_name));

        let trash_full_path = PathBuf::from(&trash_dir).join(item_name);

        if !dest.exists() {
            fs::rename(&trash_full_path, &dest).map_err(|e| {
                format!("Failed to restore {}: {}", trash_item_path, e)
            })?;
        }
    }

    Ok(())
}

/// Parse the original path from a .trashinfo file content.
fn parse_trashinfo_original_path(content: &str) -> String {
    for line in content.lines() {
        if line.starts_with("Path=") {
            let path = &line[5..];
            // URL-decode the path (e.g., %20 -> space)
            return url_decode(path);
        }
    }
    String::new()
}

/// Simple URL decoding for trashinfo paths.
fn url_decode(input: &str) -> String {
    let mut result = String::new();
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            } else {
                result.push('%');
                result.push_str(&hex);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn get_disks() -> String {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut vec: Vec<TamiaDisk> = Vec::new();

    for disk in sys.disks() {
        vec.push(TamiaDisk {
            name: disk.name().to_str().unwrap(),
            s_mount_point: disk.mount_point().display().to_string(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
            is_removable: disk.is_removable(),
        });
    }
    serde_json::to_string(&vec).unwrap().into()
}

pub struct MyState(Mutex<Option<CommandChild>>);

#[tauri::command]
fn start_scanning(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, MyState>,
    path: String,
    ratio: String,
) -> Result<(), ()> {
    scan::start(app_handle, state, path, ratio)
}

#[tauri::command]
fn stop_scanning(
    _app_handle: tauri::AppHandle,
    state: tauri::State<'_, MyState>,
    _path: String,
) -> Result<(), ()> {
    scan::stop(state);
    Ok(())
}

#[tauri::command]
fn refresh_folder(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, PartialScanState>,
    path: String,
) -> Result<(), ()> {
    scan::refresh_folder(app_handle, state, path)
}

#[tauri::command]
fn stop_refresh_folder(
    _app_handle: tauri::AppHandle,
    state: tauri::State<'_, PartialScanState>,
) -> Result<(), ()> {
    scan::stop_refresh(state);
    Ok(())
}
