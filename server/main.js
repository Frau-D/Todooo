import { Meteor } from 'meteor/meteor';
new Mongo.Collection('pieces');
new Mongo.Collection('tacks');

const Filters = new Mongo.Collection('activeFilters');

Meteor.startup(function() {
    return Meteor.methods({
        removeAllFilters: function() {
            return Filters.remove({});
        },
        removeOneFilter: function() {
            return Filters.remove({});
        }
    });
    // code to run on server at startup
});

