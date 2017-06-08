'use strict';

var AWS = require("aws-sdk");

let channel_id;

var docClient = new AWS.DynamoDB.DocumentClient();

Array.prototype.countBy = function(key) {
  return this.reduce(function(rv, x) {
    rv[x[key]] = (rv[x[key]] || 0) + 1;
    return rv;
  }, {});
};

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

Date.prototype.previousWeek = function() {
    return new Date(this.getTime() - (7 * 24 * 60 * 60 * 1000));
};

function forWeek(week) {
    var expression = "#wk = :week";
    var attrs = { ":week": week };
    if(channel_id) {
        expression += " and channel_id = :chan";
        attrs[":chan"] = channel_id;
    }
    
    return {
        TableName : "MoodResponses",
        IndexName: 'week-channel_id-index',
        FilterExpression: expression,
        ExpressionAttributeNames:{
            "#wk": "week"
        },
        ExpressionAttributeValues: attrs
    };
}

function handleError(err, callback) {
    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    callback(null, {"error": JSON.stringify(err, null, 2)});
}

function happinessMetric(moods) {
    var good = moods.good || 0;
    var bad = moods.bad || 0;
    var awesome = moods.awesome || 0;
    var terrible = moods.terrible || 0;
    
    var score = good + (bad * -1) + (awesome * 5) + (terrible * -5);
    var count = good + bad + awesome + terrible + (moods.meh || 0);
    
    return Math.round(score * 100 / count);
}

function overallMood(happiness) {
    if(happiness > 200)
        return "awesome";
    else if(happiness < -200)
        return "terrible";
    else if(happiness > 50)
        return "good";
    else if(happiness < -50)
        return "bad";
    else
        return "meh";
}

function handleData(data, callback, week) {
    console.log("Query succeeded.");
            
    var moods = data.Items.countBy("mood");
    var happiness = happinessMetric(moods);
    var results = {
        week: week,
        moods: moods,
        happiness: happiness,
        teamMood: overallMood(happiness),
        channel_id: channel_id
    };

    callback(null, results);
}

function runFor(date, tries, callback) {
    var week = date.getWeek();    
    console.log('Fetching mood results for week: ' + week);
    
    docClient.scan(forWeek(week), function(err, data) {
        if (err) {
            handleError(err, callback);
        } else if(data.Items.length > 0 || tries <= 0) {
            handleData(data, callback, week);
        } else {
            runFor(date.previousWeek(), tries - 1, callback);
        }
    });
}

exports.handler = function(event, context, callback) {
    channel_id = event.channel_id;
    
    runFor(new Date(), 1, callback);
};