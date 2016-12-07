import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var';
import {Mongo} from 'meteor/mongo';

export const Pieces = new Mongo.Collection('pieces');
export const Tacks = new Mongo.Collection('tacks');
export const Filters = new Mongo.Collection('activeFilters');

import './main.html';

// toastr package: https://atmospherejs.com/chrismbeckett/toastr
// toastr demo: http://codeseven.github.io/toastr/demo.html

Meteor.startup(() => {
    // code to run on server at startup
// TODO: let this clean-up code run as soon as the collections got loaded:
    /*Pieces.find({_id}).fetch()._id.forEach(
        deleteEmptyPiece(piece_object)
    );*/
    Meteor.call('removeAllFilters');
    Session.set('showOverview', true);
    Session.set('filterSet', false);
});


// deletes the piece if it has no associated images (no deleteTackFromPiece(), though)
var deleteEmptyPiece = function(piece_object, index,) {
    var piece_id_to_delete = piece_object._id;
    if (piece_object.image_ids.length == 0){
        console.log('----> deleteEmptyPiece: ' + piece_id_to_delete);
        Pieces.remove(piece_id_to_delete);
    }
};

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
// TODO: think hard if removing filters should be done here (#usability):
        // Meteor.call('removeAllFilters');
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
        if(Filters.find().count() < 2){
            Session.set('filterSet', false);
        }else{
            Session.set('filterSet', true);
        }
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
    'submit .filter_form'(event) {
        // Prevent default browser form submit
        event.preventDefault();
        var filter_text = event.target.filtered_tack.value.toLowerCase();
        var tag_from_db = Tacks.findOne({text: filter_text});
        var tag_already_in_Filters = Filters.findOne({text: filter_text});
        if (filter_text == ''){
            toastr.info('..empty inside...', 'I feel so...');
        }else if(tag_already_in_Filters) {
            toastr.info('Even more "' + filter_text + '"?', 'Really?!');
        }else{
            if (tag_from_db !== undefined) {
                Filters.insert({
                    text: filter_text,
                    tag_id: tag_from_db._id
                });
            } else {
                toastr.error('Nothing tagged with "' + filter_text + '" yet... Try again.', "Oh no!");
            }
        }
        event.target.filtered_tack.value = '';
    },
    'click .reset'(event){
        event.preventDefault();
        Meteor.call('removeAllFilters');
        Session.set('filterSet', false);
    }
});

Template.filterByTag.rendered = function(){
    // refresh the autocompletion box when details page is closed
    // and overview got rendered again
    refresh_autocomplete();
};


Template.filterByTag.helpers({
    filterSet(){
        return Session.get('filterSet');
    }
});


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
                    //toastr.success('File "' + fileObj.name + '" successfully uploaded: '+fileObj._id, "Awesome!");
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
    // TODO: extract deletePiece function to make use of it deleting empty pieces at startup (?)
    'click .delete'(event) {
        console.log('----> Template.piece: click .delete');

        const piece_id = event.target.dataset.pieceid;
        const piece_from_db = Pieces.findOne({_id: piece_id});
        const tag_ids_to_delete = piece_from_db.tag_ids;
        tag_ids_to_delete.forEach(function(tag_id) {
            deleteTackFromPiece(piece_id, tag_id);
        });

        const image_ids_to_delete = piece_from_db.image_ids;
        image_ids_to_delete.forEach(function(image_id) {
            deleteImageFromPiece(piece_id, image_id);
        });
        toastr.success('This piece is gone now. Seriously.', '-1!');

        Pieces.remove(this._id);
        Session.set('showOverview', true);
    },
    'change .fileInput'(event, template){
        handleUpload(event, template);
//TODO: reset/remove "No File Selected"
    },
    'submit .new-tack'(event) {
        event.preventDefault();
// TODO: autocompleting tags
        if (event.target.tacks.value == ''){
            toastr.info('..empty!', "It's just not meant to be...");
        }else{
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
    }
});


Template.piece.helpers({
    piece_id() {
        return Session.get('clickedPieceId');
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

var deleteImageFromPiece = function(piece_id, image_id_to_delete){
    console.log('----> deleteImageFromPiece');
    const piece_from_db = Pieces.findOne({_id: piece_id});
    const imageIndex = piece_from_db.image_ids.indexOf(image_id_to_delete);
    piece_from_db.image_ids.splice(imageIndex, 1); // deletes ONE element on position of imageIndex
    Pieces.update(piece_id, {
        $set: {image_ids: piece_from_db.image_ids}
    });
    Meteor.call('removeImage', image_id_to_delete);
};

Template.showImages.events({
    'click .deleteImage'(event) {
        const piece_id = this._id;
        const image_id_to_delete = event.target.dataset.imageid;
        deleteImageFromPiece(piece_id, image_id_to_delete);
    }
});


// PIECE -> SHOW TAGS

Template.showTags.helpers({
    tags() {
        return Tacks.find({"_id": {"$in": this.tag_ids}});
    }
});



var deleteTackFromPiece = function (piece_id, tag_id_to_delete) {
    console.log('----> deleteTackFromPiece');
    var tag_from_db = Tacks.findOne({_id: tag_id_to_delete});
    var piece_from_db = Pieces.findOne({_id: piece_id});

    // remove piece_id from tag_from_db.piece_ids
    tag_from_db.piece_ids.splice(tag_from_db.piece_ids.indexOf(piece_id),1);
    if(tag_from_db.piece_ids.length > 0){
        console.log('-- delete piece_id from tack');
        Tacks.update(tag_id_to_delete, {$set: {piece_ids: tag_from_db.piece_ids}});
    }else{
        // if last piece_id is removed: delete tag
        console.log('-- delete tack from db');
        Tacks.remove(tag_id_to_delete);
    }
    // remove tack_id from piece
    const tagIndex = piece_from_db.tag_ids.indexOf(tag_id_to_delete); //Index holen
    piece_from_db.tag_ids.splice(tagIndex, 1); //ein Element an Stelle des Index entfernen
    Pieces.update(piece_id, {$set: {tag_ids: piece_from_db.tag_ids}}); //tag_ids aktualisieren
};

Template.showTags.events({
    'click .deleteTag'(event) {
        console.log('----> Template.showTags: click .deleteTag');
        const piece_id = this._id;
        const tag_id_to_delete = event.target.dataset.tagid;
        console.log('-- piece_id:', piece_id, 'tag_id_to_delete:', tag_id_to_delete);
        deleteTackFromPiece(piece_id, tag_id_to_delete);
    }
});


// PIECE -> OVERVIEW BUTTON



Template.overviewButton.events({
    'click #overview'(event) {
        event.preventDefault();
        var piece_id = Session.get('clickedPieceId');
        var piece_object = Pieces.findOne({_id: piece_id});
        deleteEmptyPiece(piece_object);
        Session.set('showOverview', true);
    }
});



