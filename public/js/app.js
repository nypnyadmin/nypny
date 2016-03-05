// www.nypny.com
// Ashwin Hamal - March 2016
// 

var baseRef = new Firebase('https://nypny.firebaseio.com');
var usersRef = baseRef.child('users');
var feedbackRef = baseRef.child('feedbacks');
var auth;


// **********  Utilities
//
var alertBoxEl = $('[role="alert"]');
var boxAlert = function(msg, fail) {
  if (fail) { alertBoxEl.addClass('alert-danger').removeClass('alert-success'); }
  else { alertBoxEl.removeClass('alert-danger').addClass('alert-success'); }
  alertBoxEl.html(msg).hide().fadeIn(200);
  setTimeout(function(){ alertBoxEl.fadeOut(200); }, 1000);
};


// **********  Auth
//
var loginModal = $('#login-modal');
// Login via Facebook
$('[href="#facebook-login"]').click(function(evt) {
  evt.preventDefault();
  baseRef.authWithOAuthPopup('facebook', function(error, authData) {
    loginModal.modal('hide');
    if (error) { boxAlert('Login Failed', true); }
  }, { scope: 'email,public_profile' });
});

// Login via Google
$('[href="#google-login"]').click(function(evt) {
  evt.preventDefault();
  baseRef.authWithOAuthPopup('google', function(error, authData) {
    loginModal.modal('hide');
    if (error) { boxAlert('Login Failed', true); }
  }, { scope: 'https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/userinfo.profile' });
});

// Logout
$('[href="#logout"]').click(function(evt) {
    evt.preventDefault();
    baseRef.unauth();
});

var initialAuth = true;
var loggedInEl = $('[data-container=logged-in-nav]');
var loggedOutEl = $('[data-container=logged-out-nav]');

// Handle login/logout
function handleAuth(authData) {
  auth = authData;
  // Show Navbar
  if (authData) { 
    loggedInEl.removeClass('hidden');
    loggedOutEl.addClass('hidden'); 
  } else {
    loggedOutEl.removeClass('hidden');
    loggedInEl.addClass('hidden');
  }
  // Display alert
  if (initialAuth) { 
    initialAuth = false; 
  } else { 
    boxAlert(authData ? 'Logged In!' : 'Logged Out!'); 
  }

  // Load user info
  loadInitialData(authData);
}
baseRef.onAuth(handleAuth);

// Load initial data
var userData;
var greetEl = $('[data-container="greet"]');
function loadInitialData(authData) {
  if (!authData) return;

  var myRef = usersRef.child(authData.uid);
  myRef.once('value', function(snap) {
    userData = snap.val();
    if (userData === null) updateNewUserInfo(authData);
    greetEl.html('Hello, ' + userData.name.split(' ')[0] );
  });
}

// Copy profile when new user is created.
function updateNewUserInfo(authData) {
  userData = {};
  switch(authData.provider) {
    case 'facebook':
      $.extend(userData, {
        name: authData.facebook.displayName,
        gender: authData.facebook.cachedUserProfile.gender,
        email: authData.facebook.cachedUserProfile.email,
        picture: authData.facebook.profileImageURL,
        facebookProfile: authData.facebook.cachedUserProfile
      });
      break;
    case 'google':
      $.extend(userData, {
        name: authData.google.displayName,
        email: authData.google.email,
        picture: authData.google.profileImageURL,
        gender: authData.google.gender,
        googleProfile: authData.google.cachedUserProfile
      });
      break;
  }

  var myRef = usersRef.child(authData.uid);
  myRef.set(userData, function(error) {
    if (error) { boxAlert(error.message, true); }
    else boxAlert('Welcome to NYPNY!');
  });
}


// **********  Contact Us
// 
var form = $('#contact-us-form');
form.submit(function(evt) {
  evt.preventDefault();
  var obj = {
    name: form.find('[name=name]').val(),
    email: form.find('[name=email]').val(),
    phone: form.find('[name=phone]').val(),
    message: form.find('[name=message]').val(),
  };
  var btn = form.find('[type="submit"]').button('loading');
  feedbackRef.push(obj, function(error){
    btn.button('reset');
    if (error) {
      boxAlert('Error. Please email nypny at wg@nypny.com', true);
      return;
    }
    form.addClass('hidden');
    $('#contact-us-form-success').removeClass('hidden').hide().fadeIn(200);
  });
});



// **********  Edit Profile
// 
var profileModal = $('#profile-modal');
var profileForm = $('#profile-form');
var inputMap = {
  'name': profileForm.find('[name=name]'),
  'title': profileForm.find('[name=title]'),
  'bio': profileForm.find('[name=bio]'),
  'skills': profileForm.find('[name=skills]'),
  'email': profileForm.find('[name=email]'),
  'phone': profileForm.find('[name=phone]'),
  'address': profileForm.find('[name=address]'),
  'url': profileForm.find('[name=url]'),
  'linkedin': profileForm.find('[name=linkedin]')
};

function loadProfile(obj) {
  for (var k in inputMap) {
    inputMap[k].val( obj[k] || '');
  }
  profileForm.find('[name=visible]').prop('checked', !obj.hidden);

  // Popup
  $('[data-input="profile-picture-uploader"]').imageUploader(
    'loadImage',
    obj.picture || (obj.facebookProfile ? obj.facebookProfile.picture.data.url : '')
  );
}

function getProfile(obj) {
  var result = {};
  for (var k in inputMap) {
    result[k] = inputMap[k].val();
  }
  result.hidden = !profileForm.find('[name=visible]').prop('checked');
  return result;
}

// Click Edit Profile
$('[href="#edit-profile"]').click(function(evt) {
  var btn = $(evt.currentTarget).button('loading');
  btn.tooltip('hide');

  usersRef.child(auth.uid).once('value', function(snap) {
    btn.button('reset');
    var profileObj = snap.val();
    loadProfile(profileObj);
    profileModal.modal('show');
  });
});

// Save Profile
profileModal.find('[data-action="save"]').click(function(evt) {
  var btn = $(evt.currentTarget).button('loading');
  usersRef.child(auth.uid).update(getProfile(), function(error) {
    btn.button('reset');
    if (error){
      boxAlert('Error! ' + error + ' Please contact nypny.', true);
      return;
    }
    boxAlert('Saved!');
    //profileModal.modal('hide');
  });
});


// Image uploader
$('[data-input="profile-picture-uploader"]').imageUploader({
  width: 160,
  height: 160,
  src: 'img/profile-picture.png'
}).on('imageUploader.confirm', function(evt, file) {
  var reader = new FileReader();
  var $el = $(this);
  reader.onload = function (event) {
    var img = document.createElement('img');
    img.onload = function () {
      // TODO: Image crop/resize/validate before upload
      // if (img.width > 800 || img.width < 100 || img.width > 800 || img.width < 100) {
      //   $el.imageUploader('error', 'The image dimentions should be 800px X 800px max.');
      //   return;
      // }
      usersRef.child(auth.uid).update({ picture: event.target.result }, function(err) {
        if (err) {
          $el.imageUploader('error', err);
        } else {
          $el.imageUploader('saved');        
        }
      });
    };
    img.src= event.target.result;
  };

  $el.imageUploader('loading');
  reader.readAsDataURL(file);
});


// **********  Members display/Search
// 
var loadingTemplate = $('#loading-member-template').html();
var noMemberTemplate = $('#no-member-template').html();
var memberTemplate = $('#member-template').html();

var newMemberEl = function(user) {
  var html = _.template(memberTemplate)({
    user: user,
    authenticated: !!auth 
  });
  var el = $(html);
  el.find('[data-container="profile-picture"]').css({
    'background-image': 'url(' + ( user.picture || './img/profile-picture.png') + ')'
  });
  return el;
};

// Recent Members
var recentMembersContainer = $('#recent-members-container');
var recentMembersEl = $('#recent-members');

var searchMembersContainer = $('#search-members-container');
var searchTitleEl = $('#search-members-container .title');
var searchMembersEl = $('#search-members');

recentMembersEl.html(loadingTemplate);
var recentMembersLoding = true;

var createOrUpdateRecentMember = function(snap) {
  if (recentMembersLoding == true) {
    recentMembersEl.html('');
    recentMembersLoding = false;    
  }

  var el = recentMembersEl.find('[data-user="' + snap.key() + '"]');
  if (el.length == 0) {
    el = $('<div class="member-container" data-user="' + snap.key() + '"></div>');
    recentMembersEl.append(el);
  }
  el.html(newMemberEl(snap.val()));
}

var removeRecentUser = function(snap) {
  recentMembersEl.find('[data-user="' + snap.key() + '"]').remove();
}

var recentMembersRef = usersRef.limitToFirst(10);
var refreshRef = function() {
  var r = recentMembersRef;
  r.off('child_added', createOrUpdateRecentMember);
  r.off('child_changed', createOrUpdateRecentMember);
  r.off('child_removed', removeRecentUser);
  r.on('child_added', createOrUpdateRecentMember);
  r.on('child_changed', createOrUpdateRecentMember);
  r.on('child_removed', removeRecentUser);  
}
baseRef.onAuth(refreshRef);

// ****** Search
// 
// 
function fetchAndLoadSearchMember(id) {
  usersRef.child(id).once('value', function(snap) {
    searchMembersEl.append(
      newMemberEl(snap.val())
    )
  });
}

var searchRef = baseRef.child('search');
function searchMembers(q) {
  searchMembersEl.html(loadingTemplate);
  var reqRef = searchRef.child('request').push({ 'query': '*' + q + '*' });
  var respRef = searchRef.child( 'response/' + reqRef.key() )
  respRef.on('value', function handleResponse(snap) {
    searchMembersEl.html('');

    if( snap.val() !== null ) {     // wait for data
       snap.ref().off('value', handleResponse); // stop listening
       snap.ref().remove();         // clear the queue
       var val = snap.val();
       for (var i in val) {
         fetchAndLoadSearchMember(val[i]);
       }
    } else {
      searchMembersEl.html('No results containing all your search terms were found.');      
    }
  });
}

// search enter 3 seconds buffer
var searchedQ;
var onEnterSearchQuery = function(q) {
  if (searchedQ == q) return; searchedQ = q;

  if (q.length >= 3) {
    recentMembersContainer.addClass('hidden');
    searchMembersContainer.removeClass('hidden');
    searchTitleEl.html('Search Results for \'' + q + '\'');
    searchMembers(q)
  } else {
    recentMembersContainer.removeClass('hidden');
    searchMembersContainer.addClass('hidden');
  }
}
var onEnterSearchQueryDebounce = _.debounce(onEnterSearchQuery, 500);
$('#member-filter').on('keyup', function(evt) {
  onEnterSearchQueryDebounce( $(evt.currentTarget).val() );
});