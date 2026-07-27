---
title: Snapper
---

Snapper is a tool for making snapshots in BTRFS

## Install

```bash
sudo apt install snapper -y
```

## Subvolumes

```bash
ID      gen     top level       path
--      ---     ---------       ----
256     293     5               @home
257     64      5               @www
258     65      5               @docker
259     77      5               @postgres
260     65      5               @snapshots
```

## Snapshot configs

```bash
sudo snapper -c root create-config /
sudo snapper -c home create-config /home
sudo snapper -c www create-config /srv/www
sudo snapper -c docker create-config /srv/docker
sudo snapper -c postgres create-config /srv/postgres
```

```bash
sudo snapper -c root set-config TIMELINE_LIMIT_YEARLY=0 TIMELINE_LIMIT_MONTHLY=2
sudo snapper -c home set-config TIMELINE_LIMIT_HOURLY=0 TIMELINE_LIMIT_DAILY=7
# sudo snapper -c docker set-config TIMELINE_CREATE=no NUMBER_CLEANUP=yes
sudo snapper -c docker set-config TIMELINE_LIMIT_HOURLY=6 TIMELINE_LIMIT_DAILY=7 TIMELINE_LIMIT_MONTHLY=1 TIMELINE_LIMIT_YEARLY=0
# sudo snapper -c postgres set-config TIMELINE_CREATE=no
sudo snapper -c postgres set-config TIMELINE_CREATE=no NUMBER_CLEANUP=yes
sudo snapper -c www set-config TIMELINE_LIMIT_HOURLY=0 TIMELINE_LIMIT_DAILY=7
```

| Config     | Timeline                                            | Reasoning                               |
| ---------- | --------------------------------------------------- | --------------------------------------- |
| `root`     | on, trimmed monthly/yearly                          | OS/config recovery                      |
| `home`     | on, daily only                                      | dotfiles/user data, hourly too noisy    |
| `docker`   | on, moderate retention                              | persistent volume data worth protecting |
| `www`      | on, daily only (if not fully reproducible from git) | depends on your deploy setup            |
| `postgres` | off                                                 | separate backup strategy                |

```bash
for c in root home docker www postgres; do echo "== $c =="; sudo snapper -c $c get-config | grep -E "TIMELINE_CREATE|TIMELINE_LIMIT|NUMBER_LIMIT"; done
```

### Creating config failed (creating btrfs subvolume .snapshots failed since it already exists).

If the @.snapshots subvolume is already mounted to /.snapshots, and the snapper create-config command will fail. To use the @.snapshots subvolume for Snapper backups, do the following:

```bash
# Unmount the @.snapshots subvolume and delete the existing mountpoint.
sudo umount /.snapshots/
sudo rmdir /.snapshots/

# Create the Snapper config.

# Delete the subvolume created by Snapper.
sudo btrfs subvolume delete /.snapshots

# Re-create the /.snapshots mount point and re-mount the @.snapshots subvolume.
sudo mkdir -p /.snapshots
sudo mount -a

# mount: /.snapshots: mount() failed: No such file or directory.
sudo mount -o subvol=@.snapshots /dev/sda2 /.snapshots
```

## Timers

Confirm they're scheduled correctly:

```bash
systemctl list-timers snapper-timeline.timer snapper-cleanup.timer
# systemctl status snapper-timeline.timer snapper-cleanup.timer
# systemctl is-enabled snapper-timeline.timer snapper-cleanup.timer
```

Enable if not

```bash
sudo systemctl enable --now snapper-timeline.timer
sudo systemctl enable --now snapper-cleanup.timer
```

## Hooks

### 1. APT hooks (automatic pre/post snapshot around every `apt` operation)

Create `/etc/apt/apt.conf.d/80snapper`:

```bash
sudo nano /etc/apt/apt.conf.d/80snapper
```

```
DPkg::Pre-Invoke {"if [ -x /usr/lib/snapper/apt-snapshot ]; then /usr/lib/snapper/apt-snapshot pre; fi"};
DPkg::Post-Invoke {"if [ -x /usr/lib/snapper/apt-snapshot ]; then /usr/lib/snapper/apt-snapshot post; fi"};

# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=770938
  DPkg::Pre-Invoke  { "if [ -e /etc/default/snapper ]; then . /etc/default/snapper; fi; if [ -x /usr/bin/snapper ] && [ ! x$DISABLE_APT_SNAPSHOT = 'xyes' ] && [ -e /etc/snapper/configs/root ]; then rm -f /var/tmp/snapper-apt || true ; snapper create -d apt -c number -t pre -p > /var/tmp/snapper-apt || true ; snapper cleanup number || true ; fi"; };
  DPkg::Post-Invoke { "if [ -e /etc/default/snapper ]; then . /etc/default/snapper; fi; if [ -x /usr/bin/snapper ] && [ ! x$DISABLE_APT_SNAPSHOT = 'xyes' ] && [ -e /var/tmp/snapper-apt ]; then snapper create -d apt -c number -t post --pre-number=`cat /var/tmp/snapper-apt` || true ; snapper cleanup number || true ; fi"; };

# /etc/default/snapper
## Path: System/Snapper

## Type:        string
## Default:     ""
# List of snapper configurations.
SNAPPER_CONFIGS="root home www docker postgres"

# if you want to disable snapshot per install/upgrade, then set "yes"
DISABLE_APT_SNAPSHOT="no"
```

Then create the actual script it calls, `/usr/lib/snapper/apt-snapshot`:

```bash
sudo nano /usr/lib/snapper/apt-snapshot
```

```bash
#!/bin/bash
CONFIG="root"
TYPE="$1"

if [ "$TYPE" = "pre" ]; then
    NUM=$(snapper -c "$CONFIG" create --type pre --print-number --description "apt: $(date '+%Y-%m-%d %H:%M:%S')")
    echo "$NUM" > /run/snapper-apt-pre-number
elif [ "$TYPE" = "post" ]; then
    if [ -f /run/snapper-apt-pre-number ]; then
        PRE_NUM=$(cat /run/snapper-apt-pre-number)
        snapper -c "$CONFIG" create --type post --pre-number "$PRE_NUM" --description "apt: $(date '+%Y-%m-%d %H:%M:%S')"
        rm -f /run/snapper-apt-pre-number
    fi
fi
```

```bash
sudo chmod +x /usr/lib/snapper/apt-snapshot
```

Test it:

```bash
sudo apt update && sudo apt install -y --reinstall bash
sudo snapper -c root list
```

You should see a matched `pre`/`post` pair. `snapper status <pre>..<post>` will then show exactly what files changed during that apt run — genuinely useful for "what did this update touch."

### 2. Git deployment hooks

This depends entirely on how your deploys run (a systemd service, a CI runner, a bare-repo post-receive hook). Assuming a fairly typical setup — a `post-receive` hook in a bare repo that triggers deployment to `/srv/www`:

```bash
sudo nano /srv/git/yourrepo.git/hooks/post-receive
```

```bash
#!/bin/bash
PRE=$(snapper -c www create --type pre --print-number --description "git deploy $(date '+%Y-%m-%d %H:%M:%S')")

# ... your existing deploy commands (checkout, build, restart service, etc.) ...

snapper -c www create --type post --pre-number "$PRE" --description "git deploy $(date '+%Y-%m-%d %H:%M:%S')"
```

```bash
sudo chmod +x /srv/git/yourrepo.git/hooks/post-receive
```

If your deployment instead runs via a shell script or systemd service rather than a git hook directly, same pattern applies — wrap the deploy logic between the `pre` and `post` snapshot calls in whatever script actually triggers it.

### 3. Docker deployment hooks

Since `@docker` only holds volume data (not containers/images per what you said), the useful moment to snapshot is around whatever changes volume contents — typically a `docker compose up -d` / `docker compose pull && up -d` redeploy. Wrap your existing deploy script the same way:

```bash
#!/bin/bash
# deploy.sh
PRE=$(snapper -c docker create --type pre --print-number --description "docker deploy $(date '+%Y-%m-%d %H:%M:%S')")

cd /srv/docker/yourstack
docker compose pull
docker compose up -d

snapper -c docker create --type post --pre-number "$PRE" --description "docker deploy $(date '+%Y-%m-%d %H:%M:%S')"
```

If containers write to volumes _while running_ (not just at deploy time — e.g. a database container constantly writing), the same live-consistency caveat from Postgres applies here too: a snapshot is crash-consistent (like a power-loss point), not necessarily application-consistent, unless you stop/pause the specific container or run its own consistency command first.

## Config

```bash
# Default config
# subvolume to snapshot
SUBVOLUME="/"
# filesystem type
FSTYPE="btrfs"
# btrfs qgroup for space aware cleanup algorithms
QGROUP=""
# fraction or absolute size of the filesystems space the snapshots may use
SPACE_LIMIT="0.5"
# fraction or absolute size of the filesystems space that should be free
FREE_LIMIT="0.2"
# users and groups allowed to work with config
ALLOW_USERS=""
ALLOW_GROUPS=""
# sync users and groups from ALLOW_USERS and ALLOW_GROUPS to .snapshots
# directory
SYNC_ACL="no"
# start comparing pre- and post-snapshot in background after creating
# post-snapshot
BACKGROUND_COMPARISON="yes"
# run daily number cleanup
NUMBER_CLEANUP="yes"
# limit for number cleanup
NUMBER_MIN_AGE="1800"
NUMBER_LIMIT="50"
NUMBER_LIMIT_IMPORTANT="10"
# create hourly snapshots
TIMELINE_CREATE="yes"
# cleanup hourly snapshots after some time
TIMELINE_CLEANUP="yes"
# limits for timeline cleanup
TIMELINE_MIN_AGE="1800"
TIMELINE_LIMIT_HOURLY="10"
TIMELINE_LIMIT_DAILY="10"
TIMELINE_LIMIT_WEEKLY="0"
TIMELINE_LIMIT_MONTHLY="10"
TIMELINE_LIMIT_YEARLY="10"
# cleanup empty pre-post-pairs
EMPTY_PRE_POST_CLEANUP="yes"
# limits for empty pre-post-pair cleanup
EMPTY_PRE_POST_MIN_AGE="1800"
```

### Concepts

| Mechanism   | Explanation                                            | Mechanic                  |
| ----------- | ------------------------------------------------------ | ------------------------- |
| TIMELINE    | Hourly automatic snapshots                             | snapper-timeline.timer    |
| NUMBER      | Snapshots created manually or by hooks                 | retained via NUMBER_LIMIT |
| *_LIMIT     | How many snapshots to keep                             |
| SPACE_LIMIT | How much of the filesystem space each snapshot can use |
| FREE_LIMIT  | How much of the filesystem space should be free        |

## Commands

```bash
snapper list-configs
sudo snapper -c <config> list
```

## Checking hook results

```bash
sudo snapper -c root list
sudo snapper -c www list
sudo snapper -c docker list
sudo snapper -c root status <pre_num>..<post_num>
```

`status` between a pre/post pair is the real payoff — it gives you a `diff`-style summary of exactly what changed, which is what lets you actually use these for rollback investigation later, not just "a snapshot exists somewhere."

```ini

```

| g         | h   | j   |
| --------- | --- | --- |
| `command` |     |     |

## If swap.img in root

You cannot snapshot a subvolume that contains an active swapfile. The kernel deliberately refuses to snapshot a subvolume while one of its files is mapped as swap.

```bash
swapon --show
cat /proc/swaps
```

Move the swapfile to its own dedicated subvolume (the proper long-term fix — e.g. create @swap and mount it separately, then move the swapfile there so it's outside any subvolume that gets snapshotted). This is the approach most btrfs+snapper guides recommend.

1. Create the new subvolume at the top level

   Your other subvolumes (`@home`, `@www`, etc.) all live as siblings under top-level id 5, alongside `@snapshots`. We'll add `@swap` the same way. First mount the top-level subvolume somewhere temporary so we can create a sibling:

   ```bash
   sudo mkdir -p /mnt/btrfs-top
   sudo mount -o subvol=/ /dev/sda2 /mnt/btrfs-top
   sudo btrfs subvolume create /mnt/btrfs-top/@swap
   ```

2. Mount it at a permanent path

   ```bash
   sudo mkdir -p /swap
   ```

   Add to `/etc/fstab` (matching the style of your other entries — find the UUID with `blkid /dev/sda2` if you don't have it handy, it's the same UUID as your other btrfs entries):

   ```
   UUID=<your-uuid>  /swap  btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@swap  0  0
   ```

   Then:

   ```bash
   sudo systemctl daemon-reload
   sudo mount /swap
   ```

3. Create the swapfile in the new subvolume

   Btrfs swapfiles have special requirements: no COW, no compression, and must be fully allocated (not sparse). Don't just `mv` the old one — its extents may be fragmented or shared in ways btrfs won't allow for swap. Create fresh:

   ```bash
   sudo swapoff /swap.img          # disable current swap first
   sudo truncate -s 0 /swap/swapfile
   sudo chattr +C /swap/swapfile   # nodatacow — must be set before any data is written
   sudo fallocate -l 4G /swap/swapfile
   sudo chmod 600 /swap/swapfile
   sudo mkswap /swap/swapfile
   sudo swapon /swap/swapfile
   ```

   (If `fallocate` fails on this btrfs setup — it sometimes does with certain btrfs versions — fall back to `dd if=/dev/zero of=/swap/swapfile bs=1M count=4096 status=progress` instead, then continue from `chmod`.)

4. Update fstab's swap line and remove the old file

   Edit the existing swap entry in `/etc/fstab` (currently pointing at `/swap.img`) to instead read:

   ```
   /swap/swapfile  none  swap  sw  0  0
   ```

   Verify it's working, then clean up the old file:

   ```bash
   swapon --show
   sudo rm /swap.img
   ```

5. Confirm the fix

   ```bash
   sudo snapper -c root create --description "test"
   sudo snapper -c root list
   ```

   That should now succeed, since `/` no longer contains any active swapfile.

   One caveat worth knowing: if this machine ever uses hibernation (suspend-to-disk), a btrfs swapfile needs an extra step — the kernel resume parameter must point to a physical extent offset via `btrfs inspect-internal map-swapfile -r /swap/swapfile`, not just the file path. Since your swap shows `USED 0B` this probably isn't in active use for hibernation, but flag it if you ever set that up later.

6. Cleanup

   ```bash
   sudo umount /mnt/btrfs-top
   sudo rm -rf /mnt/btrfs-top/
   ```

### `sudo nano /etc/fstab`

```ini
# 1. Root Filesystem (BTRFS pool subvolid=5 with zstd compression)
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /              btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2                   0 0

# 2. BTRFS Subvolumes (Sharing the same partition UUID)
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /home          btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@home      0 0
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /srv/www       btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@www       0 0
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /srv/docker    btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@docker    0 0
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /srv/postgres  btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@postgres  0 0
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /.snapshots    btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@snapshots 0 0
UUID=e99ab55e-762d-4649-bc55-05fa77db5359  /swap          btrfs  defaults,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvol=@swap      0 0

# 3. EFI System Partition (DO NOT REMOVE)
/dev/disk/by-uuid/9888-8EAC                /boot/efi      vfat   defaults                                 0 1

# 4. Swap File (DO NOT REMOVE)
/swap/swapfile                                  none           swap   sw                                       0 0
```

```bash
sudo nano /etc/fstab
sudo systemctl daemon-reload
sudo mount -a
findmnt -t btrfs

TARGET          SOURCE                 FSTYPE OPTIONS
/               /dev/sda2              btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=5,subvol=/
├─/srv/www      /dev/sda2[/@www]       btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=257,subvol=/@www
├─/.snapshots   /dev/sda2[/@snapshots] btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=260,subvol=/@snapshots
├─/srv/docker   /dev/sda2[/@docker]    btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=258,subvol=/@docker
├─/srv/postgres /dev/sda2[/@postgres]  btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=259,subvol=/@postgres
├─/home         /dev/sda2[/@home]      btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=256,subvol=/@home
└─/swap         /dev/sda2[/@swap]      btrfs  rw,noatime,compress=zstd:3,ssd,discard=async,space_cache=v2,subvolid=278,subvol=/@swap
```
