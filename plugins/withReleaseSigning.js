// Expo config plugin: release APK se potpisuje vlastitim ključem umjesto debug ključa.
// Podaci o ključu su izvan projekta (nikad u gitu), u ~/.gradle/gradle.properties:
//   SAIYAN_UPLOAD_STORE_FILE, SAIYAN_UPLOAD_STORE_PASSWORD,
//   SAIYAN_UPLOAD_KEY_ALIAS, SAIYAN_UPLOAD_KEY_PASSWORD
// Ako ih nema (npr. na drugom računalu), release se potpiše debug ključem kao prije.
// android/ se generira s "npx expo prebuild", pa ova izmjena preživi svaki prebuild.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = 'SAIYAN_UPLOAD_STORE_FILE';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;

    const signing = /signingConfigs \{(\r?\n)(\s*)debug \{/;
    const release = /(release \{(?:\r?\n\s*\/\/[^\n]*)*\r?\n\s*)signingConfig signingConfigs\.debug/;
    if (!signing.test(src) || !release.test(src)) {
      throw new Error('withReleaseSigning: build.gradle nema očekivani signingConfigs/release blok');
    }

    src = src.replace(
      signing,
      (_, nl, indent) =>
        `signingConfigs {${nl}` +
        `${indent}release {${nl}` +
        `${indent}    if (project.hasProperty('${MARK}')) {${nl}` +
        `${indent}        storeFile file(${MARK})${nl}` +
        `${indent}        storePassword SAIYAN_UPLOAD_STORE_PASSWORD${nl}` +
        `${indent}        keyAlias SAIYAN_UPLOAD_KEY_ALIAS${nl}` +
        `${indent}        keyPassword SAIYAN_UPLOAD_KEY_PASSWORD${nl}` +
        `${indent}    }${nl}` +
        `${indent}}${nl}` +
        `${indent}debug {`
    );
    src = src.replace(
      release,
      `$1signingConfig project.hasProperty('${MARK}') ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = src;
    return cfg;
  });
};
