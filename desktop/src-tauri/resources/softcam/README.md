# softcam

Virtual camera driver used by the camera delay feature. `softcam.dll` is not
checked in; build it with `scripts/build-softcam.ps1`, which downloads the
pinned tshino/softcam release (MIT), builds it and copies the dll and its
LICENSE here. The app bundles everything in this folder and registers the dll
on first use.
