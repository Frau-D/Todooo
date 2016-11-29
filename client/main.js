import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var';
import {Mongo} from 'meteor/mongo';

export const Pieces = new Mongo.Collection('pieces');
export const Tacks = new Mongo.Collection('tacks');

import './main.html';

Meteor.startup(() => {
    // code to run on server at startup
    Session.set('showOverview', true);
});

var handleUpload = function (event, template) {
    if (event.currentTarget.files && event.currentTarget.files[0]) {

        // We upload only one file, in case there were multiple files selected
        var file = event.currentTarget.files[0];
        if (file) {
            var uploadInstance = Images.insert({
                file: file,
                streams: 'dynamic',
                chunkSize: 'dynamic'
            }, false);

            // uploadInstance.on('start', function() {template.currentUpload.set(this);});

            uploadInstance.on('end', function (error, fileObj) {
                if (error) {
                    alert('Error during upload: ' + error.reason);
                } else {
                    //alert('File "' + fileObj.name + '" successfully uploaded: '+fileObj._id);
                    template.data.image_ids.push(fileObj._id);

                    Pieces.update(template.data._id, {
                        $set: {image_ids: template.data.image_ids}
                    });

                }
                //template.currentUpload.set(false);
            });

            uploadInstance.start();
        }
    }
};

var refresh_autocomplete = function(){
    var availableTags = [];
    Tacks.find({}).fetch().forEach(function(element, index){
        availableTags.push(element.text);
    });
    $( "#tags_autocomplete" ).autocomplete({
        source: availableTags
    });
};


Template.filterByTag.rendered = function(){
    // refresh the autocompletion box when details page is closed
    // and overview got rendered again
    refresh_autocomplete();
};


// HELPERS HELPERS HELPERS HELPERS HELPERS HELPERS HELPERS


Template.filterByTag.helpers({
    allExistingTags() {
        refresh_autocomplete();
        return Tacks.find({});
    }
});

Template.body.helpers({
    showOverview() {
        return Session.get('showOverview');
    },
    pieces() {
        var piece_id = Session.get('clickedPieceId');
        return Pieces.find({"_id": {"$in": [piece_id]}});
    }

});

Template.allClothes.helpers({
    pieces() {
        return Pieces.find(
            {},
            { sort: { createdAt: -1 } }
        );
    },
    piece_id() {
        return this._id;
    },
    first_image() {
        return Images.find(
            {"_id": {"$in": [this.image_ids[0]]}},
        );
    }
});

Template.showImages.helpers({
    images() {
        return Images.find(
            {"_id": {"$in": this.image_ids}}
        );
    }
});

Template.showTags.helpers({
    tags() {
        return Tacks.find(
            {"_id": {"$in": this.tag_ids}}
        );
    }
});


// EVENTS EVENTS EVENTS EVENTS EVENTS EVENTS EVENTS EVENTS 


Template.body.events({
    //create new piece
    'submit .new-piece'(event) {
        // Prevent default browser form submit
        event.preventDefault();

        // Insert a piece into the collection
        var piece_id = Pieces.insert({
            image_ids: [],
            tag_ids: [],
            user_id: 'Conny',
            // TODO: substitute this with actual user-id
            createdAt: new Date()
        });
        Session.set('clickedPieceId', piece_id);
        Session.set('showOverview', false);
    }
});


Template.piece.events({
    // remove piece-object from mongodb
    'click .delete'() {
        Pieces.remove(this._id); 
        // TODO: remove associated images
    },
    'change .fileInput'(event, template){
        handleUpload(event, template);
        //TODO: "No File Selected" zurücksetzen/entfernen
    },
    'submit .new-tack'(event) {
        event.preventDefault();

        const tag_text = event.target.tacks.value;
        var tag_id;

        // TODO: Groß-/Kleinschreibung ignorieren
        var tag_from_db = Tacks.findOne({text: tag_text});
        if (tag_from_db !== undefined) {
            tag_id = tag_from_db._id
        } else {
            tag_id = Tacks.insert({text: tag_text});
        }
        if (this.tag_ids.indexOf(tag_id) == -1) { //prüfen ob's nicht drin
            this.tag_ids.push(tag_id);
            Pieces.update(this._id, {
                $set: {tag_ids: this.tag_ids}
            });
        }
        event.target.tacks.value = '';
    }
});


Template.showTags.events({
    'click .deleteTag'(event) {
        var deletedTag = event.target.dataset.tagId;
        var tagIndex = this.tag_ids.indexOf(deletedTag);
        this.tag_ids.splice(tagIndex, 1);
        Pieces.update(this._id, {
            $set: {tag_ids: this.tag_ids}
        });
    }
});


Template.allClothes.events({
    'click .overviewImage'(event) {
        piece_id = event.target.dataset.pieceid;
        Session.set('clickedPieceId', piece_id);
        Session.set('showOverview', false);
    }
});


Template.overviewButton.events({
    'click #overview'(event) {
        event.preventDefault();
        Session.set('showOverview', true);
    }
});


Template.showImages.events({
    'click .deleteImage'(event) {
        //Images.remove(this._id);
        var deletedImage = event.target.dataset.imageid;
        var imageIndex = this.image_ids.indexOf(deletedImage);
        this.image_ids.splice(imageIndex, 1); // deletes ONE element on position of imageIndex
        Pieces.update(this._id, {
            $set: {image_ids: this.image_ids}
        });
    }
});