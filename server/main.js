import { Meteor } from 'meteor/meteor';
new Mongo.Collection('pieces');
new Mongo.Collection('tacks');

Meteor.startup(() => {
  // code to run on server at startup
});
