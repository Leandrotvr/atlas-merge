// Anade Google Play Games Services al proyecto Android generado por "cap add android".
const fs = require('fs');
const path = require('path');
const APP_ID = '648286494830';
const pkg = 'app.atlasmerge.juego';
const javaDir = path.join('android/app/src/main/java', ...pkg.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
fs.copyFileSync('native/PlayGamesPlugin.java', path.join(javaDir, 'PlayGamesPlugin.java'));
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package ${pkg};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayGamesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
// dependencia
const g = 'android/app/build.gradle';
let b = fs.readFileSync(g, 'utf8');
if (!b.includes('play-services-games-v2')) {
  b = b.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "com.google.android.gms:play-services-games-v2:20.1.2"');
  fs.writeFileSync(g, b);
}
// APP_ID en strings.xml y manifest
const s = 'android/app/src/main/res/values/strings.xml';
let x = fs.readFileSync(s, 'utf8');
if (!x.includes('"app_id"')) { x = x.replace('</resources>', `    <string name="app_id" translatable="false">${APP_ID}</string>\n</resources>`); fs.writeFileSync(s, x); }
const m = 'android/app/src/main/AndroidManifest.xml';
let a = fs.readFileSync(m, 'utf8');
if (!a.includes('games.APP_ID')) {
  a = a.replace('</application>', '    <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/app_id" />\n    </application>');
  fs.writeFileSync(m, a);
}
console.log('Play Games Services anadido');
