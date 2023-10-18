# Bandon FEWS Small Data Scraper in Node.js

UPDATE OCTOBER 2023: Added a [CSV of all the river level data](https://raw.githubusercontent.com/conoro/bandonfews-nodejs/master/bandon_fews_river_level_2011_to_2018.csv) scraped from 2011 to 2018, now that Google Fusion Tables has been shutdown.

UPDATE JULY 2019: The Bandon FEWS system is being decommissioned so this code will no longer work. The OPW and Cork CoCo believe the extensive flood prevention measures they have implemented have rendered the service unnecessary. Based on the mess that is the Fish Run and Fish Kill Pond (aka the new weir), I have my doubts.

## Introduction
Cork County Council has a site called [Bandon FEWS](http://www.bandonfloodwarning.ie/) (Bandon Flood Early Warning System). When the Bandon river hits certain levels near Bandon town, it alerts registered users via SMS in case they need to take emergency measures. It's a very useful service. However the historical river level data is not available in any useful form and that's the point of this project.

In November 2011, I created a simple Python script which scrapes the site every 15 minutes and saves the river level to a Google Fusions Table "spreadsheet" [here](https://www.google.com/fusiontables/DataSource?docid=103YIcARoxuaWT7NfZ8mVBzY554sF_3ONYC1N3DE#rows:id=1). This now has (with a few interruptions) a lot of data which anyone can query, re-use or slice-dice and mashup with weather info. Not that anyone has done this :-) (Note that Fusion Tables has been shutdown. Use the CSV in this repo instead).

I re-wrote it in Node.js in 2014.

## Changelog
* 04/01/2015 - First public usable version and [blogpost](http://conoroneill.net/bandon-flood-warning-data-now-scraped-to-google-fusion-tables-using-nodejs)
* 05/01/2015 - Add error handling for parsing issues in case FEWS site changes and breaks the scraping
