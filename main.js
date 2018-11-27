#!/usr/bin/env node
/**
 * Copyright 2014 Conor O'Neill, cwjoneill@gmail.com
 * Portions copyright Google Inc. All Rights Reserved.
 * Bandon FEWS (Bandon Flood Early Warning System)
 * Scrape latest Bandon river level from http://www.bandonfloodwarning.ie/
 * and save it in Google Fusion Tables at https://www.google.com/fusiontables/DataSource?docid=103YIcARoxuaWT7NfZ8mVBzY554sF_3ONYC1N3DE#rows:id=1
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var CronJob = require('cron').CronJob;
var readline = require('readline');
var fs = require('fs');
var google = require('googleapis');
var moment = require("moment");
var request = require("request");
var cheerio = require('cheerio');

var OAuth2Client = google.auth.OAuth2;
var fusion = google.fusiontables('v2');

var config = {};
var oTokens = {};
var client_id;
var client_secret;
var redirect_url;
var fewsUrl;
var fusiontables_id;

// If running locally, use config files. If running on OpenShift, read environment variables and save to config files
// Basically trying desperately to avoid accidentally leaking keys/tokens etc. Not easy once I put code on GitHub

// TO-DO: This will fail on first-time run as there won't be real tokens.json or env vars for tokens
if (fs.existsSync(__dirname + '/config.json')) {
  config = require(__dirname + '/config.json');
  oTokens = require(__dirname + '/tokens.json');
} else{
  oTokens.access_token = process.env.access_token;
  oTokens.token_type = process.env.token_type;
  oTokens.refresh_token = process.env.refresh_token;
  oTokens.expiry_date = process.env.expiry_date;

  fs.writeFile(__dirname + "/tokens.json", JSON.stringify(oTokens, null, 4), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("tokens from env vars saved to tokens.json");
    }
  });

  config.client_id = process.env.client_id;
  config.client_secret = process.env.client_secret;
  config.redirect_url = process.env.redirect_url;
  config.fews_url = process.env.fews_url;
  config.fusiontables_id = process.env.fusiontables_id;

  fs.writeFile(__dirname + "/config.json", JSON.stringify(config, null, 4), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("config from env vars saved to config.json");
    }
  });

}


var oauth2Client = new OAuth2Client(config.client_id, config.client_secret, config.redirect_url);

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});



function getAccessToken(oauth2Client, callback) {
 // TO-DO - Handle Token expiry and refresh
  if (oTokens.access_token){
    oauth2Client.setCredentials(oTokens);
    callback();
  } else {
    // generate consent page url
    var url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // will return a refresh token
      scope: 'https://www.googleapis.com/auth/fusiontables' // can be a space-delimited string or an array of scopes
    });
    console.log('Visit the url: ', url);
    rl.question('Enter the code here:', function(code) {
      // request access token
      oauth2Client.getToken(code, function(err, tokens) {
        // set tokens to the client
        oauth2Client.setCredentials(tokens);
        fs.writeFile(__dirname + "/tokens.json", JSON.stringify(tokens, null, 4), function(err) {
          if(err) {
            console.log(err);
          } else {
            console.log("new tokens saved to tokens.json");
          }
        });
        callback();
      });
    });
  }
}

var job = new CronJob('*/15 * * * *', function(){
  // Main code. Retrieve a Google OAuth access token, get latest water level. Save to Google Fusion Tables
  getAccessToken(oauth2Client, function() {
    // Get current water level and last update time
    request(config.fews_url, function(error, response, body) {
      if (error){
        console.log("error back from Bandon FEWS", error);
        return;
      } else {
        var $ = cheerio.load(body);
        var waterLevel = $('td').eq(8).text().trim();
        // Make sure we parsed a number. If not, do not save in Fusion Tables
        if (!isNaN(waterLevel)){
          console.log(waterLevel);
          var lastUpdate = $('div').eq(1).text().trim().split(' ');
          if (lastUpdate){
            console.log(lastUpdate);
            var lastMoment = moment(lastUpdate[1] + " " + lastUpdate[2].substring(0, lastUpdate[2].length-1) + " " + lastUpdate[3] + " " + lastUpdate[5] + " GMT", "DD MMM YYYY HH:mm z");
            var fusionDate = lastMoment.format("DD-MMM-YYYY HH:mm");

            var checkLast = "SELECT * FROM " + config.fusiontables_id + " WHERE datetime='" + fusionDate + "'";

            // See if that level/time is already in Fusion Tables
            fusion.query.sqlGet({auth: oauth2Client, sql: checkLast}, function(err, response) {
              if (err) {
                console.log('A query error occured', err);
                return;
              }
              // if not in Fusion Tables then insert
              if(!(response.rows)){
                var insertNew = "INSERT INTO " + config.fusiontables_id + " (riverlevel, datetime) VALUES ('" + waterLevel + "', '" + fusionDate + "')";
                fusion.query.sql({auth: oauth2Client, sql: insertNew}, function(err, response) {
                  if (err) {
                    console.log('An insert error occured', err);
                    return;
                  }
                  console.log('inserted new row', response.rows[0]);
                  return;
                });
              } else {
                console.log("no new updates");
                return;
              }
            });
          } else {
            console.log("error parsing the datetime");
          }
        } else{
          console.log("error parsing the water level");
        }
      }
    });
  });
}, function () {
  // This function is executed when the job stops
  console.log("cron job stopped");
},
true /* Start the job right now */
);
