const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
}

const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model.bin',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model.bin',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model.bin'
];

// Clean up old shards
const oldFiles = fs.readdirSync(modelsDir);
oldFiles.forEach(f => {
    if (f.includes('shard')) fs.unlinkSync(path.join(modelsDir, f));
});

const downloadFile = (file) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(modelsDir, file);
        console.log(`Downloading: ${file}`);
        https.get(baseUrl + file, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Finished: ${file}`);
                    resolve();
                });
            } else {
                reject(`Failed to download ${file}, status: ${response.statusCode}`);
            }
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(`Error: ${err.message}`);
        });
    });
};

(async () => {
    for (const file of files) {
        try {
            await downloadFile(file);
        } catch (e) {
            console.error(e);
        }
    }
    console.log('Done!');
})();
