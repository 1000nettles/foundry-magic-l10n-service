const fs = require('fs');
const chalk = require('chalk');
const Papa = require('papaparse');

module.exports = async () => {
  let enTranslations;
  let targetTranslations;

  const targetLanguageCodes = [
    'ar',
    'zh',
    'fr',
    'de',
    'it',
    'ja',
    'ko',
    'pt-BR',
    'ru',
    'es',
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
