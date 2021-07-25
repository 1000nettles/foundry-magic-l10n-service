const fs = require('fs');
const chalk = require('chalk');
const Papa = require('papaparse');

module.exports = async () => {
  let enTranslations;
  let targetTranslations;

  /*{ code: 'ar', foundryCode: 'ar', name: 'Arabic' },
  { code: 'ca', foundryCode: 'ca', name: 'Català' },
  { code: 'zh', foundryCode: 'cn', name: '中文 (Chinese)' },
  { code: 'zh-TW', foundryCode: 'zh-tw', name: 'Chinese (Traditional)' },
  { code: 'cs', foundryCode: 'cs', name: 'Čeština' },
  { code: 'en', foundryCode: 'en', name: 'English' },
  // { code: 'fi', foundryCode: 'fi', name: 'Finnish' },
  { code: 'fr', foundryCode: 'fr', name: 'Français' },
  { code: 'de', foundryCode: 'de', name: 'Deutsch (German)' },
  { code: 'it', foundryCode: 'it', name: 'Italian' },
  { code: 'ja', foundryCode: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', foundryCode: 'ko', name: '한국어 (Korean)' },
  { code: 'pl', foundryCode: 'pl', name: 'Polski' },
  { code: 'pt', foundryCode: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'ru', foundryCode: 'ru', name: 'русский (Russian)' },
  { code: 'es', foundryCode: 'es', name: 'Español' },
  { code: 'sv', foundryCode: 'sv', name: 'Swedish' },*/

  const targetLanguageCodes = [
    'ar',
    'ca',
    'zh',
    'zh-tw',
    'cs',
    'fr',
    'de',
    'it',
    'ja',
    'ko',
    'pl',
    'pt-BR',
    'ru',
    'es',
    'sv',
  ];

  try {
    enTranslations = await fs.readFileSync('./files/en.json', 'utf8');
    enTranslations = JSON.parse(enTranslations);
  } catch (e) {
    console.log(chalk.red(
      `Cannot find English base file. ${e}`
    ));
  }
  
  for (const languageCode of targetLanguageCodes) {
    const targetFilePath = `./files/${languageCode}.json`;
    try {
      targetTranslations = await fs.readFileSync(targetFilePath, 'utf8');
      targetTranslations = JSON.parse(targetTranslations);
    } catch (e) {
      console.log(chalk.red(
        `Cannot find target language file "${targetFilePath}". ${e}`
      ));
    }
  
    const rows = [
      ['en', languageCode],
    ];
    for (const [enKey, enValue] of Object.entries(enTranslations)) {
      if (targetTranslations?.[enKey] === undefined) {
        //console.log(chalk.yellow(
        //  `Cannot find English translation key ${enKey} within "${targetFilePath}"`,
        //));
  
        continue;
      }
  
      rows.push([
        enValue,
        targetTranslations[enKey],
      ]);
    }
  
    const csvContent = Papa.unparse(rows, {
      quotes: true,
    });
    
    const filename = `./files/generated/${languageCode}_parallel_data.csv`;
    try {
      await fs.writeFileSync(filename, csvContent);
    } catch (e) {
      console.log(chalk.red(
        `Could not write final parallel data file. ${e}`,
      ));
    }
  }

  console.log(chalk.green(
    `Success! New file can be found in "./files/generated"`,
  ));
}
