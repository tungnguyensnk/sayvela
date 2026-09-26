// the app asks for administrator rights: without them windows hides keyboard and
// mouse input from our hooks whenever an elevated window has focus, so the assist
// hotkey would silently miss presses.
const ADMIN_MANIFEST: &str = r#"<?xml version="1.0" encoding="utf-8"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2, PerMonitor</dpiAwareness>
      <longPathAware xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">true</longPathAware>
    </windowsSettings>
  </application>
</assembly>
"#;

fn main() {
    // files dropped into the bundled folder later must still be picked up;
    // tauri only watches the files it saw on the previous build
    println!("cargo:rerun-if-changed=resources/softcam");
    let attributes = tauri_build::Attributes::new().windows_attributes(
        tauri_build::WindowsAttributes::new().app_manifest(ADMIN_MANIFEST),
    );
    tauri_build::try_build(attributes).expect("failed to run tauri build");
}
