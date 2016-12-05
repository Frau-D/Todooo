import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var';
import {Mongo} from 'meteor/mongo';

export const Pieces = new Mongo.Collection('pieces');
export const Tacks = new Mongo.Collection('tacks');
export const Filters = new Mongo.Collection('activeFilters');

import './main.html';

Meteor.startup(() => {
    // code to run on server at startup
// TODO: remove all unused pieces (e.g. check existance of images)
    Meteor.call('removeAllFilters');
    Session.set('showOverview', true);
});



// BODY 

Template.body.helpers({
    showOverview() {
        return Session.get('showOverview');
    },
    pieces() {
        var piece_id = Session.get('clickedPieceId');
        return Pieces.find({"_id": {"$in": [piece_id]}});
    }

});


Template.body.events({
    //create new piece
    'submit .new-piece'(event) {
        // Prevent default browser form submit
        event.preventDefault();
// TODO: add current filters as tags
// TODO: add placeholder pic
        // Insert a piece into the collection
        var piece_id = Pieces.insert({
            image_ids: [],
            tag_ids: [],
            user_id: 'Conny',
// TODO: substitute this with actual user-id
            createdAt: new Date()
        });
        Session.set('clickedPieceId', piece_id);
        // Meteor.call('removeAllFilters');
        // TODO: think hard if removing filters should be done here (#usability)!
        Session.set('showOverview', false);
    }
});



// OVERVIEW 

Template.allClothes.helpers({
    pieces() {
        var set_filters = false;
        var filtered_piece_ids = new Set();
        Filters.find({}).fetch().forEach(
            function(element, index,){
                var tag_from_db = Tacks.findOne({_id: element.tag_id});
                var tmpSet = new Set(tag_from_db.piece_ids);
                if(filtered_piece_ids.size == 0){
                    filtered_piece_ids = tmpSet;
                }else{
                    filtered_piece_ids = new Set([...filtered_piece_ids].filter(x => tmpSet.has(x)));
                }
                set_filters = true;
                console.log(filtered_piece_ids);
            }
        );
        if(set_filters){
            return Pieces.find(
                {"_id": {"$in": [...filtered_piece_ids]}},
                { sort: { createdAt: -1 } }
            );

        } else  {
            // no filter set: return all pieces
            return Pieces.find(
                {},
                { sort: { createdAt: -1 } }
            );
        }
    },
    piece_id() {
        return this._id;
    },
    first_image() {
        return Images.find(
            {"_id": {"$in": [this.image_ids[0]]}} // [0] gets the first element only
        );
    }
});

Template.allClothes.events({
    'click .overviewImage'(event) {
        piece_id = event.target.dataset.pieceid;
        Session.set('clickedPieceId', piece_id);
        Session.set('showOverview', false);
    }
});



// OVERVIEW -> FILTER 

var refresh_autocomplete = function(){
    var availableTags = [];
    Tacks.find({}).fetch().forEach(function(element, index,){
        availableTags.push(element.text);
    });
    $( "#tags_autocomplete" ).autocomplete({
        source: availableTags
    });
};

Template.activeFilters.helpers({
    filteredTags() {
        //refresh_autocomplete();
/*        console.log('----->>>>>>');
        console.log([...allCurrentFilters.values()]);
        console.log(Filters.find());*/
        return Filters.find();
    }
});

Template.activeFilters.events({
    'click .filter-tag'(event) {
        const filter_id_to_delete = event.target.dataset.tagid;
        Filters.remove(filter_id_to_delete);
    }
});

Template.filterByTag.events({
    'submit .ui-widget'(event) {
        // Prevent default browser form submit
        event.preventDefault();

        var filter_text = event.target.filtered_tack.value.toLowerCase();
        var tag_from_db = Tacks.findOne({text: filter_text});
        if (tag_from_db !== undefined) {
            Filters.insert({
                text: filter_text,
                tag_id: tag_from_db._id
            });

// TODO: temporarily remove already selected Filters from availableTags
        } else {
            console.log('No such tag!');
// TODO: add ui error message
        }
        event.target.filtered_tack.value = '';
    }
});

Template.filterByTag.rendered = function(){
    // refresh the autocompletion box when details page is closed
    // and overview got rendered again
    refresh_autocomplete();
};



// PIECE

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


Template.piece.events({
    // remove piece-object from mongodb
    'click .delete'() {
// TODO: delete piece_id from this specific tack: ...
        /*var pieceIdToDelete = this._id;
        Tacks.find({}).fetch().forEach(function(element, index,){
            arrayOfPieceIds.push(element._id);
        });*/
        Pieces.remove(this._id);
        Session.set('showOverview', true);
// TODO: remove associated images
    },
    'change .fileInput'(event, template){
        handleUpload(event, template);
//TODO: "No File Selected" zurücksetzen/entfernen
    },
    'submit .new-tack'(event) {
        event.preventDefault();
// TODO: actually prevent default
// TODO: autocompleting tags
        const tag_text = event.target.tacks.value.toLowerCase();
        const piece_id = this._id;
        var tag_id;
        //console.log(piece_id);

        var tag_from_db = Tacks.findOne({text: tag_text});
        if (tag_from_db !== undefined) {
            // update list of piece_ids for this tag
            tag_id = tag_from_db._id;
            if (tag_from_db.piece_ids.indexOf(piece_id) == -1){ //  only add piece_id when not already in piece_ids
                tag_from_db.piece_ids.push(piece_id);
                Tacks.update(tag_id, {$set: {piece_ids: tag_from_db.piece_ids}});
            }
        } else {
            // insert new tag into Tacks-collection
            tag_id = Tacks.insert({
                text: tag_text,
                piece_ids: [piece_id]
            });
        }
        // check if it's not already in tag_ids of the piece
        if (this.tag_ids.indexOf(tag_id) == -1) {
            this.tag_ids.push(tag_id);
            Pieces.update(piece_id, {$set: {tag_ids: this.tag_ids}});
        }
        // clear input field
        event.target.tacks.value = '';
    }
});


Template.showImages.helpers({
    images() {
        return Images.find(
            {"_id": {"$in": this.image_ids}}
        );
    }
});


// PIECE -> SHOW IMAGES

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


// PIECE -> SHOW TAGS

Template.showTags.helpers({
    tags() {
        return Tacks.find(
            {"_id": {"$in": this.tag_ids}}
        );
    }
});


Template.showTags.events({
    'click .deleteTag'(event) {
    // TODO: delete piece_id from this specific tack
        const piece_id = this._id;
        const tag_id_to_delete = event.target.dataset.tagid;
        var tagIndex = this.tag_ids.indexOf(tag_id_to_delete);
        this.tag_ids.splice(tagIndex, 1);
        Pieces.update(piece_id, {$set: {tag_ids: this.tag_ids}});

        var tag_from_db = Tacks.findOne({_id: tag_id_to_delete});
        // remove piece_id from tag_from_db.piece_ids
        tag_from_db.piece_ids.splice(tag_from_db.piece_ids.indexOf(piece_id),1);
        if(tag_from_db.piece_ids.length > 0){
            Tacks.update(tag_id_to_delete, {$set: {piece_ids: tag_from_db.piece_ids}});
        }else{
            // if last piece_id is removed: delete tag
            Tacks.remove(tag_id_to_delete);
        }
    }
});


// PIECE -> OVERVIEW BUTTON

Template.overviewButton.events({
    'click #overview'(event) {
        event.preventDefault();
        Session.set('showOverview', true);
    }
});