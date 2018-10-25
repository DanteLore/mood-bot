'use strict';

var AWS = require("aws-sdk");

let channel_id;

var docClient = new AWS.DynamoDB.DocumentClient();

Array.prototype.countBy = function (key) {
    return this.reduce(function (rv, x) {
        rv[x[key]] = (rv[x[key]] || 0) + 1;
        return rv;
    }, {});
};

Array.prototype.groupBy = function (key) {
    return this.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

Date.prototype.subtractWeeks = function (wks) {
    return new Date(this.getTime() - (wks * 7 * 24 * 60 * 60 * 1000));
};

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

function sinceWeek(week, year) {
    var expression;
    if(year < new Date().getFullYear()) {
        expression = "(#wk >= :week and #yr = :year) or (#yr > :year)";
    }
    else {
        expression = "#wk >= :week and #yr = :year";
    }
    
    var attrs = { ":week": week, ":year": year };
    if (channel_id) {
        expression += " and channel_id = :chan";
        attrs[":chan"] = channel_id;
    }

    return {
        TableName: "MoodResponses",
        IndexName: 'week-channel_id-index',
        FilterExpression: expression,
        ExpressionAttributeNames: {
            "#wk": "week",
            "#yr": "year"
        },
        ExpressionAttributeValues: attrs
    };
}

function handleError(err, callback) {
    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    callback(null, { "error": JSON.stringify(err, null, 2) });
}

function handleData(data, callback, week) {
    console.log("Query succeeded.");

    var results = [];
    
    data.Items.forEach(function (x) {
        x.yearWeek = parseInt(x.year) * 100 + parseInt(x.week);
    });
    
    var weekData = data.Items.groupBy("yearWeek");
    
    var weeks = Object.keys(weekData).sort();

    weeks.forEach(function (yw) {
        var moods = weekData[yw].countBy("mood");
        var score = happinessMetric(moods);
        var yr = yw.split('.')[0];
        var wk = yw.split('.')[1];

        var row = { 
            week: weekData[yw][0].week,
            score: score,
            teamMood: overallMood(score),
            moods: moods
        };

        results.push(row);
    });

    callback(null, results);
}

function runFor(start, callback) {
    var week = start.getWeek();
    var year = start.getFullYear();
    console.log('Fetching mood results since week: ' + week + " year: " + year);

    docClient.scan(sinceWeek(week, year), function (err, data) {
        if (err) {
            handleError(err, callback);
        } else {
            handleData(data, callback, week);
        }
    });
}

exports.handler = function (event, context, callback) {
    channel_id = event.channel_id;

    runFor(new Date().subtractWeeks(10), callback);
};
