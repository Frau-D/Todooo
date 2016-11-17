import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Mongo } from 'meteor/mongo';

export const Pieces = new Mongo.Collection('pieces');
export const Tacks = new Mongo.Collection('tacks');

import './main.html';

var handleUpload = function (e, template) {
  if (e.currentTarget.files && e.currentTarget.files[0]) {
    console.warn("----> UPLOAD");

    // We upload only one file, in case there were multiple files selected
    var file = e.currentTarget.files[0];
    if (file) {
      var uploadInstance = Images.insert({
        file: file,
        streams: 'dynamic',
        chunkSize: 'dynamic'
      }, false);

      // uploadInstance.on('start', function() {template.currentUpload.set(this);});

      uploadInstance.on('end', function(error, fileObj) {
        if (error) {
          alert('Error during upload: ' + error.reason);
        } else {
          //alert('File "' + fileObj.name + '" successfully uploaded: '+fileObj._id);
          template.data.image_ids.push(fileObj._id);

          console.log(template);

        }
        //template.currentUpload.set(false);
      });

      uploadInstance.start();
    }
  }
};


Template.uselessButton.onCreated(function uselessButtonOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});
Template.uselessButton.helpers({
  counter() {
    return Template.instance().counter.get();
  }
});
Template.uselessButton.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  }
});


Template.uploadedFiles.helpers({
  uploadedFiles: function () {
    return Images.find(); // {}, {sort: { createdAt: -1 } } nach Uploaddatum sortieren...
  }
});


Template.uploadForm.onCreated(function () {
  this.currentUpload = new ReactiveVar(false);
});


Template.uploadForm.helpers({
  currentUpload: function () {
    return Template.instance().currentUpload.get();
  }
});


Template.uploadForm.events({
  'change .fileInput': handleUpload
});


Template.body.helpers({
  pieces() {
    return Pieces.find({});
  }
});

// create new piece
Template.body.events({
  'submit .new-piece'(event) {
    // Prevent default browser form submit
    event.preventDefault();

    // Get value from form element
    const target = event.target; // TODO: substitute this with the image_ids

    // Insert a piece into the collection
    Pieces.insert({
      text: event.target.text.value,
      image_ids:[],
      tag_ids: [],
      user_id: 'Conny', // TODO: substitute this with actual user-id
      createdAt: new Date()
    });

    // Clear form
    target.text.value = '';
  }
});

Template.piece.events({
  'click .delete'() {
    Pieces.remove(this._id); // removes piece-object from mongodb
    // TODO: remove associated images
  },
  'change .fileInput': handleUpload,
  'click .save'() {
    Pieces.update(this._id, {
      $set: {image_ids: this.image_ids}
    });
  }
});


