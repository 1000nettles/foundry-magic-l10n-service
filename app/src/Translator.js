'use strict';

const AWS = require('aws-sdk');

module.exports = class Translator {

  async translate(translations, toTranslate) {
    const enTranslation = translations.find(
      translation => translation.lang === 'en'
    );
    console.log(enTranslation);

    if (!enTranslation) {
      console.error('No english translation found');
      return;
    }

    AWS.config.update({ region: 'us-east-1' });
    const awsTranslate = new AWS.Translate();

    for (const locale of toTranslate) {
      for (const entry of Object.entries(enTranslation.content)) {
        const [key, value] = entry;
        var params = {
          SourceLanguageCode: 'en',
          TargetLanguageCode: locale,
          Text: value
        };

        console.log(`About to translate ${value}`);
  
        await awsTranslate.translateText(params, (err, data) => {
          if (err) {
            console.log(err, err.stack); 
          } else {
            console.log(data['TranslatedText']);
          }
        }).promise();

        break;
      }
    }
  }

}
