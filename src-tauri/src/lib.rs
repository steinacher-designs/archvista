//! ARCHVISTA desktop shell: project storage, website export, in-app preview server,
//! secure credential storage (Windows Credential Manager) and a local benchmark log.

use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

use percent_encoding::percent_decode_str;
use serde::Serialize;
use tauri::http::{Response, StatusCode};
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, Manager, State};

const KEYRING_SERVICE: &str = "ARCHVISTA";

#[derive(Default)]
struct Preview(Mutex<HashMap<String, Vec<u8>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RecentProject {
    id: String,
    title: String,
    file_name: String,
    updated_at: String,
    thumb: Option<String>,
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// Only plain file names / relative paths without traversal are accepted.
fn safe_rel(p: &str) -> Result<PathBuf, String> {
    let path = Path::new(p);
    if path.is_absolute() || path.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err(format!("unsafe path: {p}"));
    }
    Ok(path.to_path_buf())
}

fn safe_id(id: &str) -> Result<&str, String> {
    if id.is_empty() || id.len() > 64 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("invalid project id".into());
    }
    Ok(id)
}

fn projects_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(err)?.join("projects");
    fs::create_dir_all(&d).map_err(err)?;
    Ok(d)
}

fn header(req: &Request, name: &str) -> Result<String, String> {
    let v = req.headers().get(name).ok_or(format!("missing header {name}"))?;
    let s = v.to_str().map_err(err)?;
    Ok(percent_decode_str(s).decode_utf8_lossy().to_string())
}

fn body<'a>(req: &'a Request<'_>) -> Result<&'a [u8], String> {
    match req.body() {
        InvokeBody::Raw(b) => Ok(b),
        _ => Err("expected binary body".into()),
    }
}

// ——— projects (autosave) ———

#[tauri::command]
fn project_save(app: AppHandle, id: String, json: String, thumb: Option<String>) -> Result<(), String> {
    let dir = projects_dir(&app)?.join(safe_id(&id)?);
    fs::create_dir_all(&dir).map_err(err)?;
    // write atomically: temp file + rename, so a crash never leaves a broken project
    let tmp = dir.join("project.json.tmp");
    fs::write(&tmp, json).map_err(err)?;
    fs::rename(&tmp, dir.join("project.json")).map_err(err)?;
    if let Some(t) = thumb {
        fs::write(dir.join("thumb.txt"), t).map_err(err)?;
    }
    Ok(())
}

#[tauri::command]
fn project_save_source(app: AppHandle, request: Request) -> Result<(), String> {
    let id = header(&request, "x-id")?;
    let dir = projects_dir(&app)?.join(safe_id(&id)?);
    fs::create_dir_all(&dir).map_err(err)?;
    fs::write(dir.join("source.dxf"), body(&request)?).map_err(err)
}

#[tauri::command]
fn project_list(app: AppHandle) -> Result<Vec<RecentProject>, String> {
    let mut out = vec![];
    for e in fs::read_dir(projects_dir(&app)?).map_err(err)?.flatten() {
        let p = e.path().join("project.json");
        let Ok(txt) = fs::read_to_string(&p) else { continue };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) else { continue };
        let s = |k: &str| v.get(k).and_then(|x| x.as_str()).unwrap_or_default().to_string();
        out.push(RecentProject {
            id: s("id"),
            title: s("title"),
            file_name: s("fileName"),
            updated_at: s("updatedAt"),
            thumb: fs::read_to_string(e.path().join("thumb.txt")).ok(),
        });
    }
    out.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(out)
}

#[tauri::command]
fn project_load(app: AppHandle, id: String) -> Result<Option<String>, String> {
    let p = projects_dir(&app)?.join(safe_id(&id)?).join("project.json");
    Ok(fs::read_to_string(p).ok())
}

#[tauri::command]
fn project_load_source(app: AppHandle, id: String) -> Result<tauri::ipc::Response, String> {
    let p = projects_dir(&app)?.join(safe_id(&id)?).join("source.dxf");
    Ok(tauri::ipc::Response::new(fs::read(p).map_err(err)?))
}

#[tauri::command]
fn project_delete(app: AppHandle, id: String) -> Result<(), String> {
    let p = projects_dir(&app)?.join(safe_id(&id)?);
    if p.exists() {
        fs::remove_dir_all(p).map_err(err)?;
    }
    Ok(())
}

// ——— website export ———

/// Writes one file of the generated website below the folder the user picked.
#[tauri::command]
fn write_site_file(request: Request) -> Result<(), String> {
    let dir = PathBuf::from(header(&request, "x-dir")?);
    let rel = safe_rel(&header(&request, "x-path")?)?;
    let target = dir.join(rel);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(err)?;
    }
    fs::write(target, body(&request)?).map_err(err)
}

// ——— in-app website preview (served from memory via the preview:// protocol) ———

#[tauri::command]
fn preview_clear(state: State<Preview>) {
    state.0.lock().unwrap().clear();
}

#[tauri::command]
fn preview_put(state: State<Preview>, request: Request) -> Result<(), String> {
    let path = header(&request, "x-path")?;
    safe_rel(&path)?;
    state.0.lock().unwrap().insert(path, body(&request)?.to_vec());
    Ok(())
}

fn mime(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript",
        "json" => "application/json",
        "css" => "text/css",
        "glb" => "model/gltf-binary",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

// ——— credentials (Windows Credential Manager / macOS Keychain / Secret Service) ———

#[tauri::command]
fn secret_set(key: String, value: String) -> Result<(), String> {
    keyring::Entry::new(KEYRING_SERVICE, &key).map_err(err)?.set_password(&value).map_err(err)
}

#[tauri::command]
fn secret_get(key: String) -> Result<Option<String>, String> {
    match keyring::Entry::new(KEYRING_SERVICE, &key).map_err(err)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(err(e)),
    }
}

#[tauri::command]
fn secret_delete(key: String) -> Result<(), String> {
    match keyring::Entry::new(KEYRING_SERVICE, &key).map_err(err)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(err(e)),
    }
}

// ——— benchmarks ———

#[tauri::command]
fn benchmark_append(app: AppHandle, line: String) -> Result<(), String> {
    let d = app.path().app_data_dir().map_err(err)?;
    fs::create_dir_all(&d).map_err(err)?;
    let mut f = fs::OpenOptions::new().create(true).append(true).open(d.join("benchmarks.jsonl")).map_err(err)?;
    writeln!(f, "{line}").map_err(err)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Preview::default())
        .register_uri_scheme_protocol("preview", |ctx, request| {
            let state = ctx.app_handle().state::<Preview>();
            let raw = request.uri().path().trim_start_matches('/');
            let path = percent_decode_str(raw).decode_utf8_lossy().to_string();
            let path = if path.is_empty() { "index.html".to_string() } else { path };
            let files = state.0.lock().unwrap();
            match files.get(&path) {
                Some(data) => Response::builder().header("Content-Type", mime(&path)).body(data.clone()).unwrap(),
                None => Response::builder().status(StatusCode::NOT_FOUND).body(b"not found".to_vec()).unwrap(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            project_save,
            project_save_source,
            project_list,
            project_load,
            project_load_source,
            project_delete,
            write_site_file,
            preview_clear,
            preview_put,
            secret_set,
            secret_get,
            secret_delete,
            benchmark_append
        ])
        .run(tauri::generate_context!())
        .expect("error while running ARCHVISTA");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_path_traversal() {
        assert!(safe_rel("assets/scene.glb").is_ok());
        assert!(safe_rel("../evil.txt").is_err());
        assert!(safe_rel("/etc/passwd").is_err());
        assert!(safe_rel("a/../../b").is_err());
    }
    #[test]
    fn validates_ids() {
        assert!(safe_id("a1b2c3d4e5f6").is_ok());
        assert!(safe_id("..").is_err());
        assert!(safe_id("x/y").is_err());
    }
}
