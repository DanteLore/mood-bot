'use strict';

var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB.DocumentClient();
const table = "MoodResponses";

function updateVoters(original, voter) {
    var updated = original;
    
    var msg = "\nVoted so far: ";
    var comma = true;
    if(!updated.includes(msg)) {
        updated = updated + msg;
        comma = false;
    }
    
    if(!updated.includes(voter)) {
        if(comma) {
            updated = updated + ", ";
        }
        
        updated = updated + "<@" + voter + ">";
    }

    return updated;
}

Date.prototype.getWeek = function() {
        var onejan = new Date(this.getFullYear(), 0, 1);
        return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    }

exports.handler = function(event, context, callback) {
    
    console.log('Received Slack Message: ', JSON.stringify(event, null, 2));
    
    var mood = event.actions[0].value;
    var date = new Date(Number(event.message_ts) * 1000);
    var key = event.user.id + "@" + date.getFullYear() + "-" + date.getWeek();
    var record = {
        TableName: table,
        Item: {
            key: key,
            message_ts: Number(event.message_ts),
            username: event.user.name,
            user_id: event.user.id,
            channel_name: event.channel.name,
            channel_id: event.channel.id,
            mood: mood,
            date_string: date.toISOString(),
            day: date.getDate(),
            month: (date.getMonth() + 1),
            week: date.getWeek(),
            year: date.getFullYear()
        }
    };
    
    console.log("Created mood record: " + JSON.stringify(record, null, 2));

    dynamo.put(record, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                
            callback(null, {
                  text: "An error occurred inserting to DynamoDB. Error attached.",
                  attachments: [{text: JSON.stringify(err, null, 2)}],
                  replace_original: false
                });
        } else {
            console.log("Added item:", JSON.stringify(record, null, 2));
            
            callback(null, {
                  text: updateVoters(event.original_message.text, event.user.id),
                  attachments: event.original_message.attachments,
                  replace_original: true
                });
        }
    });
    
};