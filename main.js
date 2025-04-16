// main.js or wherever you're handling the logic
const path = require('path')
const {app, BrowserWindow, ipcMain, screen} = require('electron')
const axios = require('axios');

let notifications = [];
const notificationHeight = 110;
const notificationWidth = 380;
const notificationGap = 3;
const notificationLifeTime = 5000;

async function downloadIconAsBase64(url) {
    const response = await axios.get(url, {responseType: 'arraybuffer'});
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'];
    return `data:${contentType};base64,${base64}`;
}

function animateMoveTo(win, targetY, duration = 120) {
    const intervalTime = 10; // ~60fps
    const steps = duration / intervalTime;
    let currentBounds = win.getBounds();
    let stepY = (targetY - currentBounds.y) / steps;

    let count = 0;

    const interval = setInterval(() => {
        if (win.isDestroyed()) {
            clearInterval(interval);
            return;
        }

        currentBounds = win.getBounds();
        const newY = currentBounds.y + stepY;

        win.setBounds({
            x: currentBounds.x,
            y: Math.round(newY),
            width: currentBounds.width,
            height: currentBounds.height
        });

        count++;

        if (count >= steps) {
            // End animation — snap to final position
            win.setBounds({
                x: currentBounds.x,
                y: targetY,
                width: currentBounds.width,
                height: currentBounds.height
            });
            clearInterval(interval);
        }
    }, intervalTime);
}

function repositionNotifications(startIndex) {
    for (let i = startIndex; i < notifications.length; i++) {
        const win = notifications[i];
        if (!win.isDestroyed()) {
            const {width, height} = screen.getPrimaryDisplay().workAreaSize;
            const newY = height - ((notificationHeight + notificationGap) * (i + 1));
            animateMoveTo(win, newY);
        }
    }
}

function showCustomNotification() {
    const display = screen.getPrimaryDisplay()
    const {width, height} = display.workArea
    const index = notifications.length;
    const notificationWindow = new BrowserWindow({
        width: notificationWidth,
        height: notificationHeight,
        x: width - (notificationWidth + notificationGap),
        y: height - ((notificationHeight + notificationGap) * (index + 1)),
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        focusable: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'notifyPreload.js'),
        }
    })

    notificationWindow.loadFile(path.join(__dirname, '/pages/notify.html'))
    notifications.push(notificationWindow);

    const meta = {
        title: "Sakura Books",
        maxLength: notificationWidth,
        description: "Bilim kurtak ochadigan sahifa!",
        iconUrl: "https://picsum.photos/60/60",
        lifeTime: "https://picsum.photos/60/60",
    };

    // Ikonkani yuklab olib base64 ga o‘giramiz
    // meta.icon = await downloadIconAsBase64(meta.iconUrl);

    // Frontendga yuboramiz
    notificationWindow.webContents.send('set-meta', meta);


    notificationWindow.once('ready-to-show', () => {
        notificationWindow.show()

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (!notificationWindow.isDestroyed()) {
                notificationWindow.close()
            }
        }, notificationLifeTime)
    });

    notificationWindow.on('closed', () => {
        const closedIndex = notifications.indexOf(notificationWindow);
        if (closedIndex !== -1) {
            notifications.splice(closedIndex, 1);
            repositionNotifications(closedIndex);
        }
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Secure bridge
        }
    })

    win.loadFile('pages/index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
let i = 0;
ipcMain.on('open-new-window', () => {
    showCustomNotification()
    i++
})


app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

module.exports = {showCustomNotification}
