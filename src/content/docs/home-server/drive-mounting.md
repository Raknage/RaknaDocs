---
title: Moving files from second drive
---

1. Identify the Drive & Partition Name

   ```bash
   lsblk
   ```

   Look for your new drive in the output by its **size** (e.g., `238.5G` or `465.8G`).

   - **The Drive:** Usually named something like `sdb` or `sdc`.
   - **The Partition:** The specific numeric partition holding your data, such as `sdb1` or `sdc1`.

2. Create a Mount Point

   Before you can read files from the SSD, you need to map it to a folder in your filesystem.

   Create a temporary folder (mount point) in `/mnt`:

   ```bash
   sudo mkdir -p /mnt/another_ssd
   ```

3. Mount the Drive

   Attach the SSD's partition to the folder you just created _(be sure to replace `sdb1` with your actual partition name from Step 1)_:

   ```bash
   sudo mount /dev/sdb1 /mnt/another_ssd
   ```

   > 💡 **Note on Filesystems:** If the SSD was previously used in a Windows machine and formatted as NTFS or exFAT, Ubuntu will usually auto-detect it. If it gives a filesystem error, specify the type manually:
   >
   > - For NTFS: `sudo mount -t ntfs-3g /dev/sdb1 /mnt/another_ssd`
   > - For FAT32/exFAT: `sudo mount -t vfat /dev/sdb1 /mnt/another_ssd`

4. Verify Content & Transfer Files

   1. **Check the contents of the SSD:**

   ```bash
   ls -la /mnt/another_ssd

   ```

   2. **Copy the files:**
      Using `rsync` is strongly recommended over standard `cp` because it shows progress and preserves file permissions:

   ```bash
   sudo rsync -avP --mkpath /mnt/another_ssd/ /path/to/destination/

   ```

   - _`-a` (archive):_ Preserves file permissions, timestamps, and symlinks.
   - _`-v` (verbose):_ Shows what files are being copied.
   - _`-P` (progress):_ Displays a progress bar and allows resuming if interrupted.
   - _`--mkpath`:_ Create destination's missing path components

## Step 5: Unmount the Drive Safely

Once the copy process finishes, safely unmount the SSD before turning off the system or physically disconnecting it:

```bash
sudo umount /mnt/another_ssd

```
