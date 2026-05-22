# JumiPDF 0.1.0 Release Notes

JumiPDF is a local Windows desktop PDF page editor. It opens and edits PDFs on your computer without uploading files or using cloud processing.

## Downloads

Choose one installer:

- `JumiPDF Setup 0.1.0 Windows 10-11 x64.exe` for Windows 10 and Windows 11.
- `JumiPDF Setup 0.1.0 Legacy Win7 x64.exe` for Windows 7, Windows 8, and Windows 8.1.

Use the Windows 10/11 installer whenever possible. The legacy installer exists only for older Windows machines.

## What You Can Do

- Open local PDF files.
- Drag and drop PDFs into the app.
- Preview pages as thumbnails.
- Click the magnifier on a thumbnail to view a larger page preview.
- Delete pages.
- Reorder pages by dragging.
- Rotate pages left or right.
- Undo and redo edits.
- Save as a new PDF.
- Overwrite the original PDF after confirmation.
- Open password-protected PDFs when you know the password.
- Remove print/edit restrictions before editing.

## Locked PDF Support

JumiPDF includes QPDF 12.3.2 locally for locked PDF handling.

Supported locked PDF cases:

- PDFs that require a known open password.
- PDFs that open without a password but block printing, editing, extraction, or assembly.
- Some damaged-but-readable PDFs that QPDF can repair while unlocking.

JumiPDF does not guess, crack, or recover unknown passwords.

Edited output files are saved as unlocked PDFs.

## Privacy

PDF files stay on your computer. JumiPDF does not upload files, require an account, or contact a server to process PDFs.

## Windows Security Notice

These installers are not code-signed. Windows SmartScreen may show a warning when opening the installer.

If you trust the source of the installer, choose:

```text
More info -> Run anyway
```

## Known Notes

- Very large PDFs may take longer to load, unlock, preview, or save.
- Some severely damaged PDFs may still fail if QPDF cannot repair them.
- The legacy installer is x64. The bundled QPDF runtime is also x64.
