---
title: User Management & Permissions Cheat Sheet
---

## 1. User Management

| Task                                | Command                               | Notes                                                             |
| ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Add user (with home dir)            | `sudo adduser <name>`                 | Interactive, sets password + GECOS fields, creates `/home/<name>` |
| Add user (minimal, scriptable)      | `sudo useradd -m -s /bin/bash <name>` | `-m` = create home, `-s` = shell                                  |
| Set/change password                 | `sudo passwd <name>`                  | Omit name to change your own                                      |
| Delete user                         | `sudo deluser <name>`                 | Add `--remove-home` to also delete home dir                       |
| Lock account                        | `sudo passwd -l <name>`               | Disables password login, keeps account                            |
| Unlock account                      | `sudo passwd -u <name>`               |                                                                   |
| Show user info (UID/GID/groups)     | `id <name>`                           |                                                                   |
| List all local users                | `cut -d: -f1 /etc/passwd`             |                                                                   |
| Show login/password aging           | `chage -l <name>`                     | Expiry, last change, warning period                               |
| Force password change at next login | `sudo chage -d 0 <name>`              |                                                                   |
| Switch user                         | `su - <name>`                         | `-` loads their environment/login shell                           |
| Run one command as user             | `sudo -u <name> <command>`            |                                                                   |

## 2. Group Management

| Task                          | Command                            | Notes                                                                                  |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Create group                  | `sudo groupadd <group>`            |                                                                                        |
| Delete group                  | `sudo groupdel <group>`            | Fails if it's a user's primary group                                                   |
| Add existing user to group    | `sudo usermod -aG <group> <name>`  | **Always use `-aG`** (append), never `-G` alone — plain `-G` replaces all their groups |
| Remove user from group        | `sudo gpasswd -d <name> <group>`   |                                                                                        |
| List a user's groups          | `groups <name>` or `id -nG <name>` |                                                                                        |
| List all groups               | `cut -d: -f1 /etc/group`           |                                                                                        |
| Change a user's primary group | `sudo usermod -g <group> <name>`   | Lowercase `-g` = primary group                                                         |
| See who's in a group          | `getent group <group>`             |                                                                                        |

**Key files:** `/etc/passwd` (users), `/etc/shadow` (hashed passwords, root-only), `/etc/group` (groups), `/etc/sudoers` (sudo rules — edit only via `visudo`).

## 3. Permission Basics (rwx)

| Symbol  | Meaning (file)                 | Meaning (directory)                 |
| ------- | ------------------------------ | ----------------------------------- |
| `r` (4) | Read file contents             | List directory contents (`ls`)      |
| `w` (2) | Modify/overwrite file          | Create/delete/rename entries inside |
| `x` (1) | Execute file as program/script | Enter directory (`cd`), traverse it |

Three sets, always in this order: **owner (u) / group (g) / others (o)**.

```
-rwxr-xr--  1 raknage raknage  4096 Jul 28 10:00 deploy.sh
 │└┬┘└┬┘└┬┘
 │ u  g  o
 └─ file type (- file, d dir, l symlink)
```

## 4. Reading & Setting Permissions

| Task                 | Command                              | Notes                                                                                           |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| View permissions     | `ls -l`                              |                                                                                                 |
| Change with symbols  | `chmod u+x,g-w,o=r file`             | `+` add, `-` remove, `=` set exactly                                                            |
| Change with octal    | `chmod 754 file`                     | See octal table below                                                                           |
| Recursive            | `chmod -R 755 dir/`                  | Careful — applies to files _and_ dirs alike; usually you want different modes for each (see §7) |
| Change owner         | `sudo chown raknage file`            |                                                                                                 |
| Change owner + group | `sudo chown raknage:raknage file`    |                                                                                                 |
| Change group only    | `sudo chgrp raknage file`            | or `chown :raknage file`                                                                        |
| Recursive ownership  | `sudo chown -R raknage:raknage dir/` | Common after cloning a repo as root                                                             |

### Octal cheat table

| Octal | Permission | rwx             |
| ----- | ---------- | --------------- |
| 0     | ---        | none            |
| 1     | --x        | execute only    |
| 2     | -w-        | write only      |
| 3     | -wx        | write + execute |
| 4     | r--        | read only       |
| 5     | r-x        | read + execute  |
| 6     | rw-        | read + write    |
| 7     | rwx        | full            |

Common combos: `644` (rw-r--r--, normal file), `755` (rwxr-xr-x, executable/script or dir), `600` (rw-------, private key/secret), `700` (dir only owner can enter).

## 5. Special Permissions

| Bit        | Symbol                              | Set with                              | Effect                                                                                               |
| ---------- | ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| SUID       | `s` in owner's x slot (`rwsr-xr-x`) | `chmod u+s file` or `chmod 4755 file` | Program runs with the **file owner's** privileges, not the caller's (e.g. `/usr/bin/passwd`)         |
| SGID       | `s` in group's x slot               | `chmod g+s dir` or `chmod 2755 dir`   | On a **directory**: new files inherit the directory's group. On a file: runs with group's privileges |
| Sticky bit | `t` in others' x slot (`rwxrwxrwt`) | `chmod +t dir` or `chmod 1777 dir`    | In a shared writable dir (like `/tmp`), users can only delete/rename **their own** files             |

## 6. ACLs (finer-grained than owner/group/other)

| Task                                              | Command                          | Notes                                  |
| ------------------------------------------------- | -------------------------------- | -------------------------------------- |
| View ACL                                          | `getfacl file`                   |                                        |
| Grant user extra access                           | `setfacl -m u:otheruser:rx file` | Doesn't touch normal owner/group perms |
| Grant group extra access                          | `setfacl -m g:groupname:rw file` |                                        |
| Set default ACL on a dir (inherited by new files) | `setfacl -d -m u:name:rx dir/`   |                                        |
| Remove an ACL entry                               | `setfacl -x u:name file`         |                                        |
| Remove all ACLs                                   | `setfacl -b file`                |                                        |

## 7. sudo

| Task                                    | Command                                                                     | Notes                                                   |
| --------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| Edit sudo rules safely                  | `sudo visudo`                                                               | Syntax-checks before saving                             |
| Grant full sudo (Ubuntu)                | `sudo usermod -aG sudo <name>`                                              | Standard admin group on Debian/Ubuntu                   |
| Allow passwordless sudo for one command | in `visudo`: `raknage ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart myapp` | Scope tightly — never `NOPASSWD: ALL` on a hardened box |
| Run last command with sudo              | `sudo !!`                                                                   |                                                         |
| Check what you can run                  | `sudo -l`                                                                   |                                                         |

## 8. Quick Diagnostic Recipes

| Symptom                                 | Check                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| "Permission denied" on a file you own   | Check parent dir has `x` for you (`ls -ld parentdir`) — you need traverse permission too                                            |
| Caddy/nginx can't read your web files   | Usually **not** an ownership issue — world-readable (`644`/`755`) is enough; the service user just needs `r`/`x`, no `chown` needed |
| Docker-mounted files owned by wrong UID | Containers write as their internal UID; match host UID with `--user $(id -u):$(id -g)` or fix with `chown -R` after                 |
| New group membership not taking effect  | Group changes need a new login session — `newgrp <group>` for current shell, or log out/in / `su - $USER`                           |
| Script won't execute                    | `chmod +x script.sh` — missing execute bit is the #1 cause                                                                          |

---

_Grant the narrowest permission that works, prefer group membership and ACLs over broad `chmod 777`, and never edit `/etc/sudoers` directly._

### Quick full diagnostic in one go

```bash
namei -l /srv/runners/gh-raknage
```

`namei -l` walks the entire path and shows ownership/permissions at every level — it'll immediately show you which directory in the chain is the actual blocker, rather than guessing.

## Github runner user setup

Dedicated service account and group

### 1. Create a dedicated system user for the runner

```bash
# --system: no home dir prompts, UID from system range, no password
# --shell /usr/sbin/nologin: cannot be used for interactive login
# --home /srv/runners/gh-raknage: where the runner binary + work dir live
# --group creates a matching primary group `ghrunner` at the same time
sudo adduser --system --shell /usr/sbin/nologin --home /srv/runners/gh-raknage --group ghrunner
```

keep that primary group as this user's own, don't reuse it elsewhere. It's the _secondary_ group membership you'll reuse (see below).

Since it's `nologin`, nobody can `ssh` in or `su` to it interactively — the only way it runs anything is via the systemd service you install it as.

### 2. Create a reusable "deploy target" group

Create a neutral group that represents "things allowed to write deployed content that Caddy serves":

```bash
sudo groupadd webdeploy
```

Then:

- Any **service account** that needs to _write_ deployed files (ghrunner today, maybe a future CI/CD user, a Docker container's bind-mount UID, etc.) gets added to `webdeploy`.
- `caddy` does **not** need to join `webdeploy` — it just needs `r-x`, which world-readable perms already grant it.

```bash
# Append new group to new users groups
sudo usermod -aG webdeploy ghrunner
# Append to <YOUR_USER>
sudo usermod -aG webdeploy <YOUR_USER>
# Refresh shell after to apply!
```

Now `/srv/runners` ownership becomes:

```bash
sudo mkdir -p /srv/runners
sudo chown -R ghrunner:webdeploy /srv/runners
sudo find /srv/runners -type d -exec chmod 2775 {} \;   # rwxrwsr-x, SGID
sudo find /srv/runners -type f -exec chmod 664 {} \;    # rw-rw-r--
```

Now project e.g. `/srv/www/raknaDocs`, ownership becomes:

```bash
sudo mkdir -p /srv/www/raknaDocs
sudo chown -R ghrunner:webdeploy /srv/www/raknaDocs
sudo find /srv/www/raknaDocs -type d -exec chmod 2775 {} \;   # rwxrwsr-x, SGID
sudo find /srv/www/raknaDocs -type f -exec chmod 664 {} \;    # rw-rw-r--
```

Group gets write here because `webdeploy` members are trusted deploy actors, not the web server itself — different trust level, different group.

**Why this scales:** next month when you add a second CI job, a build container, or another automated deploy path, it just gets its own `--system --shell /usr/sbin/nologin` user and joins `webdeploy`. You never touch `chown` on shared directories again — new members automatically get correct access, and SGID makes sure new files/subdirs inherit the group.

### 3. Install the runner service as that user

GitHub's runner installer supports this directly:

```bash
cd /srv/runners/gh-raknage
sudo ./svc.sh install ghrunner
sudo ./svc.sh start
```

This generates a systemd unit (`actions.runner.*.service`) with `User=ghrunner`, so the whole runner process — and everything a workflow executes — runs under that account, not `toni`.

### 4. Scope sudo tightly (only if the runner truly needs privileged steps)

If a workflow needs to e.g. restart a systemd unit after deploy, don't give broad sudo — scope it per-command in `visudo`:

```
ghrunner ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart raknage-astro.service
```

Nothing else. If a workflow ever needs another privileged action, add that exact command as its own line — resist `NOPASSWD: ALL`.

### Reusable pattern going forward

| New automated task           | User                                        | Groups                                                               |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| GitHub runner                | `ghrunner` (`--system --shell nologin`)     | primary `ghrunner`, secondary `webdeploy`                            |
| Future backup script         | `resticbackup` (`--system --shell nologin`) | primary own, secondary `webdeploy` or new `backupreaders`            |
| Future container build agent | `ciagent` (`--system --shell nologin`)      | primary own, secondary `webdeploy` + `docker` if it needs the daemon |

> **The rule of thumb:**
>
> one system user per automated actor, shared groups for shared resources, nologin shell always,
> sudo scoped per-command, never reuse your personal login account (`toni`) as a service identity.
