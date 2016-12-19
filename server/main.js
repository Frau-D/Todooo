import { Meteor } from 'meteor/meteor';
new Mongo.Collection('pieces');
new Mongo.Collection('tacks');

const Filters = new Mongo.Collection('activeFilters');


Meteor.startup(function() {

    // code to run on server at startup
    return Meteor.methods({
        removeAllFilters: function() {
            return Filters.remove({});
        },
        removeImage: function(image_id) {
            console.log('----> remove Image');
            return Images.remove(image_id);
        }/*,
        removePiece: function(piece_id) {
            console.log('----> remove Piece');
            return Pieces.remove(piece_id);
        }*/
    });
});

