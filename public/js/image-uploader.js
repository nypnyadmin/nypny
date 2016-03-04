/*!
 * Image Uploader Plugin for www.nypny.com
 * Ashwin Hamal March 2016
 */

(function($, window, document, undefined) {
  'use strict';

  var ImageUploader = function(element, opts) {
    this.$el = $(element);
    for (var option_key in ImageUploader.defaults) {
      this[option_key] = opts[option_key];
    }
    this._init();
  };

  ImageUploader.defaults = {
    'src': undefined,
    'name': 'image',
    'height': 300,
    'width': 300,
    uploadButtonClass: 'btn btn-primary',
    uploadButtonText: '<i class="fa fa-upload"></i>',
    removeButtonClass: 'btn btn-danger',
    removeButtonText: '<i class="fa fa-close"></i>',
    saveButtonClass: 'btn btn-success',
    saveButtonText: '<i class="fa fa-check"></i>',
    loadingImageHTML: '<i class="fa fa-spinner fa-2x spin"></i>',
    errorOKButtonClass: 'btn btn-danger',
    errorOKButtonText: 'Ok'
  };

  ImageUploader.prototype = {
    constructor: ImageUploader,

    $: function(selector) {
      return this.$el.find(selector);
    },
 
    _init: function() {
      var self = this;

      self.template = [
        '<div class="image-uploader ', (!window.FileReader ? 'no-support' : '') ,'" ',
          'style="width:',self.width ,'px; height:', self.height, 'px">',
          // Image upload container
          '<div class="overlay shadowed upload">',
            '<input type="file" name="', self.name, '" accept="image/*">',
            '<div class="middle">',
              '<button type="button" class="', self.uploadButtonClass || '' ,'" data-action="upload">',
                self.uploadButtonText || 'Upload',
              '</button>',
            '</div>',
          '</div>',

          // Yes/No confirm dialog
          '<div class="overlay confirm-dialog">',
            '<div class="middle">',
              '<div>',
                '<button type="button" class="', self.removeButtonClass || '' ,'" data-action="upload-cancel">',
                  self.removeButtonText,
                '</button>',
                '<button type="button" class="', self.saveButtonClass ,'" data-action="upload-confirm">',
                  self.saveButtonText,
                '</button>',
              '</div>',
            '</div>',
          '</div>',

          // Loading screen
          '<div class="overlay shadowed loader">',
            '<div class="middle">',
              self.loadingImageHTML,
            '</div>',
          '</div>',

          // Error Screen
          '<div class="overlay shadowed errored">',
            '<div class="middle">',
              '<div data-container="error-text">Error!</div>',
              '<button class="', self.errorOKButtonClass ,'" data-action="error-ok">', self.errorOKButtonText ,'</button>',
            '</div>',
          '</div>',

          // Error Screen
          '<div class="overlay unsupported">',
            '<div class="middle">Your browser doesn\'t support Image Uploader</div>',
          '</div>',

          // Preview
          '<img class="preview" data-conatiner="preview">',
        '</div>'
      ].join('');

      self.$el
        .html(self.template)

        .on('click', '[data-action=upload]', function(evt) {
          evt.preventDefault();
          self.$('input[type="file"]').click();
        })

        .on('change', 'input[type="file"]', function() {
          var wrapper = self.$('.image-uploader');
          if (this.files && this.files[0]) {
            self.previewFile(this.files[0]);
            self.$el.trigger('imageUploader.change', this.files[0]);
            wrapper.addClass('confirming');
          }
        })

        .on('click', '[data-action=upload-cancel]', function(evt) {
          evt.preventDefault();
          self.$('.image-uploader').removeClass('confirming');
          self.revert();
          self.$el.trigger('imageUploader.cancel');
        })

        .on('click', '[data-action=upload-confirm]', function(evt) {
          evt.preventDefault();
          self.$('.image-uploader').removeClass('confirming');
          self.$el.trigger( 'imageUploader.confirm', self.$('input[type="file"]')[0].files[0]);
        })

        .on('click', '[data-action=error-ok]', function(evt) {
          evt.preventDefault();
          self.$('.image-uploader').removeClass('errored');
        });

      self.setFile({
        success: function() {
          self.previewFile(self.file);
        }
      });
    },

    loadImage: function(src) {
      if (src)
        this.$el.find('img.preview').attr('src', src);
    },

    setFile: function(cbs) {
      // Loads file from self.src.
      var self = this;
      if (!self.src) throw 'ImageUploader requires a src attribute.';

      var xhr = new XMLHttpRequest();
      xhr.open('GET', self.src, true);
      xhr.responseType = 'blob';
      xhr.onload = function() {
        if (this.status == 200) {
          self.file = this.response;
          if (cbs && 'success' in cbs) cbs.success();
        } else {
          throw 'Couldn\'t find url (' + url + ').';
        }
      };

      xhr.send();
    },

    previewFile: function(img) {
      var self = this;
      var preview = self.$('.preview');
      self.preview_file = img;

      var file_reader = new FileReader();
      file_reader.onload = function(e) {
        preview.attr('src', e.target.result);
        self.cropImage(preview);
      };
      file_reader.readAsDataURL(img);
    },

    cropImage: function(preview) {
      preview.css({ 'width': 'initial', 'height': 'initial' });

      var h = preview.height();
      var w = preview.width();

      var i_ratio = (h/w);
      var ratio = this.height / this.width;
      var new_h, new_w;

      if (ratio < h/w) {
        new_h = Math.floor(this.width * i_ratio);
        new_w = this.width;
      } else {
        new_h = this.height;
        new_w = Math.floor(this.height / i_ratio);
      }

      preview.css({
        'height': new_h + 'px',
        'width': new_w + 'px',
        'margin-left': -(new_w - this.width)/2 + 'px',
        'margin-top': -(new_h - this.height)/2 + 'px'
      });
    },

    loading: function() {
      this.$('.image-uploader').addClass('loading');
    },

    saved: function() {
      this.$('.image-uploader').removeClass('loading');
      this.file = this.preview_file;
    },

    error: function(html) {
      this.$('.image-uploader').removeClass('loading');
      this.$('.image-uploader').addClass('errored');
      this.revert();
      this.$el.find('[data-container=error-text]').html(html);
    },

    revert: function() {
      this.previewFile(this.file);
      this.$('input[type="file"]').val('');
    }
  };

  // jQuery plugin
  $.fn.imageUploader = function(option) {
    var args = Array.apply(null, arguments);
    args.shift();

    return this.each(function() {
      var
        $this = $(this),
        data = $this.data('imageUploader'),
        options = typeof option === 'object' && option;
      if (!data) {
        $this.data('imageUploader', (
          data = new ImageUploader(this, $.extend({}, ImageUploader.defaults, options, $this.data()))
        ));
      }

      if (typeof option === 'string') {
        data[option].apply(data, args);
      }
    });
  };
})(jQuery, window, document);