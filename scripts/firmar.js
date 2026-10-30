// Prepara el proyecto Android para publicar en Play Store:
// - firma el release con la clave de subida (variables de entorno)
// - sube versionCode con cada compilacion
const fs = require('fs');
const f = 'android/app/build.gradle';
let g = fs.readFileSync(f, 'utf8');
const code = process.env.VERSION_CODE || '1';
const name = process.env.VERSION_NAME || '1.0.0';
g = g.replace(/versionCode \d+/, 'versionCode ' + code).replace(/versionName "[^"]*"/, 'versionName "' + name + '"');
if (!g.includes('signingConfigs')) {
  g = g.replace('    buildTypes {', `    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {`).replace('        release {\n            minifyEnabled false', '        release {\n            signingConfig signingConfigs.release\n            minifyEnabled false');
}
fs.writeFileSync(f, g);
console.log('build.gradle listo: versionCode ' + code);
