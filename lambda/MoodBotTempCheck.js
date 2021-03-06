'use strict';

// NOTE:  Pass your slack hook URL in the event JSON like so:
//
// {
//    "hookUrl": "https://hooks.slack.com/services/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"
// }

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');
 
let hookUrl;

const message = {
  "text": ":thermometer: <!here> *Time for a Team Temp Check!* <!here> :thermometer: \n _Click as many times as you like, only your last vote will be counted._",
  "attachments": [
    {
      "text": "How are you feeling this week?",
      "fallback": "I am unable to understand your feelings. Too deep maybe?",
      "callback_id": "mood_survey",
      "color": "#3AA3E3",
      "actions": [
        {
          "name": "mood",
          "text": "Good :+1:",
          "type": "button",
          "value": "good"
        },
        {
          "name": "mood",
          "text": "Meh :neutral_face:",
          "type": "button",
          "value": "meh"
        },
        {
          "name": "mood",
          "text": "Bad :-1:",
          "type": "button",
          "value": "bad"
        },
        {
          "name": "mood",
          "text": "Terrible :rage:",
          "type": "button",
          "value": "terrible"
        },
        {
          "name": "mood",
          "text": "AWESOME!!!   :doge:",
          "type": "button",
          "value": "awesome"
        }
      ]
    }
  ]
}

function postMessage(inputData, callback) {
    const body = JSON.stringify(message);
    const options = url.parse(hookUrl);
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };

    const postReq = https.request(options, (res) => {
        const chunks = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            if (callback) {
                callback({
                    body: chunks.join(''),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });

    postReq.write(body);
    postReq.end();
}

function processEvent(slackMessage, callback) {
    postMessage(slackMessage, (response) => {
        if (response.statusCode < 400) {
            console.info('Message posted successfully');
            callback(null);
        } else if (response.statusCode < 500) {
            console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            callback(null);  // Don't retry because the error is due to a problem with the request
        } else {
            // Let Lambda retry
            callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
        }
    });
}

exports.handler = (event, context, callback) => {
    console.log("Sending a temp check request");
    
    hookUrl = event.hookUrl;
    
    processEvent(event, callback);
};