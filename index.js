'use strict';
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// grab the environment variables
// const SLACK_VERIFICATION_TOKEN = process.env.SLACK_VERIFICATION_TOKEN;
// const oauthToken = process.env.SLACK_AUTH_TOKEN;
// const SLACK_WELCOME_CHANNEL = process.env.SLACK_WELCOME_CHANNEL;
// const SLACK_POST_TO_CHANNEL = process.env.SLACK_POST_TO_CHANNEL;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/event', (req, res) => {
  let q = req.body;
  console.log('*** Event triggered');
  console.log(q);

  // To see if the request is coming from Slack
  if (q.token !== 'Mfrga2hhn22nla65WBXUPvmG') {
    console.log("Something wrong with your slack verification token");
    res.sendStatus(400);
    return;
  }

  // App setting validation
  if (q.type === 'url_verification') {
    res.send(q.challenge);
  }

  // Events
  else if (q.type === 'event_callback') {
    console.log("in event callback");
    if(!q.event.text) return;

    // Exclude the message from a bot, also slash command
    let regex = /(^\/)/;
    if(q.event.subtype === 'bot_message' || regex.test(q.event.text)) return;

    console.log("analyzing tone begins....");
    analyzeTone(q.event);

    res.sendStatus(200);
  }
  // switch (req.body.type) {
  //   case 'url_verification': {
  //     res.send({ challenge: req.body.challenge });
  //     break;
  //   }
  //   case 'event_callback': {
  //     if (req.body.token === SLACK_VERIFICATION_TOKEN) {
  //       const event = req.body.event;

  //       let regex = /(^\/)/;
  //       if(event.subtype === 'bot_message' || regex.test(event.text)) return;
  //       if (!event.text) {
  //         return;
  //       }
  //       analyzeTone(event);
  //       res.sendStatus(200);
  //     } else {
  //       res.sendStatus(500);
  //     }
  //     break;
  //   }
  //   default: { res.sendStatus(500); }
  // }

  // will implement the bot here ...
});

var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

var tone_analyzer = new ToneAnalyzerV3({
  "url": "https://gateway.watsonplatform.net/tone-analyzer/api",
  "username": "765da3bd-b025-4502-8efd-32a807559480",
  "password": "euHP0r2ZcRp7",
  "version": "2017-09-21"
});

const confidencethreshold = 0.55;

function postEmotion(emotion, ev) {
  console.log('Current Emotion is', emotion.tone_id);

  let username = '';
  request.post('https://slack.com/api/users.info', {form: {token: 'xoxb-374495400229-377740045184-sZJf4DdF2QhUaTi40IoqbTr2', user: ev.user}}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      username = JSON.parse(body).user.name;
      let message = username + ' is feeling ' + emotion.tone_id;

      let options = {
        method: 'POST',
        uri: 'https://slack.com/api/chat.postMessage',
        form: {
          token: 'xoxb-374495400229-377740045184-sZJf4DdF2QhUaTi40IoqbTr2',
          channel: ev.channel,
          text: message,
          as_user: false,
          username: 'Watson Bot'
        }
      };

      request(options, (error, response, body) => {
        if (error) {
          console.log(error)
        }
      });
    }
  });
}

function analyzeTone(ev) {
  let text = ev.text;

  let regex = /(^:.*:$)/; // Slack emoji, starts and ends with :
  if(regex.test(text)) {
    text = text.replace(/_/g , ' ');
    text = text.replace(/:/g , '');
  }

  console.log("Trying to analyze the message");

  tone_analyzer.tone({text: text}, (err, tone) => {
    if (err) {
      console.log(err);
    } else {
      console.log(tone);
      tone.sentences_tone.forEach((sentence) => {
        if(sentence.tones.length > 0){
          console.log(sentence.tones);
          sentence.tones.forEach((emotion) => {
            // if(emotion.score >= confidencethreshold) { // pulse only if the likelihood of an emotion is above the given confidencethreshold
              postEmotion(emotion, ev)
            // }
          })
        }
      })
    }
  });
}

const server = app.listen(5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

