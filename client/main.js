import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var';
import {Mongo} from 'meteor/mongo';

export const Pieces = new Mongo.Collection('pieces');
export const Tacks = new Mongo.Collection('tacks');

import './main.html';

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


Template.body.helpers({
    pieces() {
        return Pieces.find({});
    }
});

Template.showTags.helpers({
    tags() {
        return Tacks.find({"_id": {"$in": this.tag_ids}});
    }
});

Template.showImages.helpers({
    images() {
        return Images.find({"_id": {"$in": this.image_ids}});
    }
});


// create new piece
Template.body.events({
    'submit .new-piece'(event) {
        // Prevent default browser form submit
        event.preventDefault();

        // Insert a piece into the collection
        Pieces.insert({
            image_ids: [],
            tag_ids: [],
            user_id: 'Conny',
            // TODO: substitute this with actual user-id
            createdAt: new Date()
        });
    }
});


Template.piece.events({
    'click .delete'() {
        Pieces.remove(this._id); // removes piece-object from mongodb
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
        if(this.tag_ids.indexOf(tag_id) == -1){ //prüfen ob's nicht drin
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