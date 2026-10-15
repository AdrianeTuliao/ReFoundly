const fs = require('fs');
const path = require('path');
const multer = require('multer');

const USERS_TABLE = 'users';      // <- change if your table has another name
const ID_COLUMN = 'id';           // <- change if your primary key has another name
const MAX_MB = 2;                 // keep in sync with MAX_MB in user_acc.js

module.exports = function registerAvatarRoutes(app, { db, getUserId, uploadsRoot, middleware = [] } = {}) {
    if (!app || !db || !getUserId) throw new Error('avatar-backend: app, db and getUserId are required');

    const avatarDir = path.join(uploadsRoot || path.join(__dirname, 'uploads'), 'avatars');
    fs.mkdirSync(avatarDir, { recursive: true });

    // works with callback-style mysql/mysql2 and with mysql2/promise
    const pdb = typeof db.promise === 'function' ? db.promise() : db;
    async function query(sql, params) {
        const out = await pdb.query(sql, params);
        return Array.isArray(out) && Array.isArray(out[0]) ? out[0] : out[0] ?? out;
    }

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
        fileFilter: (req, file, cb) => {
            if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
            cb(new Error('INVALID_TYPE'));
        },
    });

    // real file type from the first bytes (the browser's mimetype can be faked)
    function detectExt(buf) {
        if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
        if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
        if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return '.webp';
        return null;
    }

    function removeOldFile(publicPath) {
        if (!publicPath || !publicPath.startsWith('/uploads/avatars/')) return;
        const file = path.join(avatarDir, path.basename(publicPath));   // basename: no path tricks
        fs.promises.unlink(file).catch(() => {});
    }

    // POST /api/user/profile-picture   (multipart field "avatar")
    app.post('/api/user/profile-picture', ...middleware, (req, res) => {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Please log in again.' });

        upload.single('avatar')(req, res, async (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: `Photo is too large (max ${MAX_MB} MB).` });
                if (err.message === 'INVALID_TYPE') return res.status(400).json({ success: false, message: 'Only JPG, PNG or WebP images are allowed.' });
                return res.status(400).json({ success: false, message: 'Upload failed.' });
            }
            if (!req.file) return res.status(400).json({ success: false, message: 'No photo received.' });

            const ext = detectExt(req.file.buffer);
            if (!ext) return res.status(400).json({ success: false, message: 'That file is not a valid image.' });

            try {
                const rows = await query(`SELECT profile_picture FROM ${USERS_TABLE} WHERE ${ID_COLUMN} = ?`, [userId]);
                const oldPath = rows && rows[0] ? rows[0].profile_picture : null;

                const filename = `user-${userId}-${Date.now()}${ext}`;
                await fs.promises.writeFile(path.join(avatarDir, filename), req.file.buffer);
                const publicPath = `/uploads/avatars/${filename}`;

                await query(`UPDATE ${USERS_TABLE} SET profile_picture = ? WHERE ${ID_COLUMN} = ?`, [publicPath, userId]);
                removeOldFile(oldPath);
                res.json({ success: true, profile_picture: publicPath });
            } catch (e) {
                console.error('profile-picture upload error:', e);
                res.status(500).json({ success: false, message: 'Could not save your photo. Please try again.' });
            }
        });
    });

    // DELETE /api/user/profile-picture   (back to initials)
    app.delete('/api/user/profile-picture', ...middleware, async (req, res) => {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Please log in again.' });
        try {
            const rows = await query(`SELECT profile_picture FROM ${USERS_TABLE} WHERE ${ID_COLUMN} = ?`, [userId]);
            const oldPath = rows && rows[0] ? rows[0].profile_picture : null;
            await query(`UPDATE ${USERS_TABLE} SET profile_picture = NULL WHERE ${ID_COLUMN} = ?`, [userId]);
            removeOldFile(oldPath);
            res.json({ success: true });
        } catch (e) {
            console.error('profile-picture delete error:', e);
            res.status(500).json({ success: false, message: 'Could not remove your photo.' });
        }
    });
};