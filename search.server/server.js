var Firebase = require('firebase');
var elasticsearch = require('elasticsearch');
var fb = new Firebase('nypny.firebaseio.com');
var fbUser = fb.child('users');

var client = new elasticsearch.Client({ host: 'localhost:9200' });
var indexName = 'nypny';
var type = 'document';

// Reset on load
client.indices.delete({ index: indexName });
client.indices.create({ index: indexName });

// Create/Update user
function createOrUpdateIndex(snap) {
  var snapVal = snap.val();

  client.index({
    index: indexName,
    type: 'document',
    id: snap.key(),
    body: {
      name: snapVal.name,
      email: snapVal.email,
      address: snapVal.address,
      skills: snapVal.address,
      title: snapVal.title,
      bio: snapVal.bio
    }
  }, function(error, response){
    console.log('added', snap.key());
  });
}

// Delete user (by the admin)
function removeIndex(snap) {
  client.delete({
    index: indexName,
    type: 'document',
    id: snap.key()
  }, function(error, response) {
    if (error) console.error('Failed to delete', snap.key(), error);
    else console.log('deleted', snap.key());
  });
}

fbUser.on('child_added',   createOrUpdateIndex);
fbUser.on('child_changed', createOrUpdateIndex);
fbUser.on('child_removed', removeIndex);


// Handle search
var fbSearchRequest = fb.child('search/request');
var fbSearchResponse = fb.child('search/response');
function processSearchRequest(snap) {
  snap.ref().remove();
  client.search({
    index: indexName,
    type: 'document',
    from: 0,
    size: 100,
    body: { query: { query_string: { query: snap.val().query } } }
  }, function(error, result) {
    if (error) {
      if (error) console.error(error);
    } else if (result && result.error) {
      fbSearchResponse.child(snap.key()).set({ error: result.error.reason });
    } else if (result) {
      var ids = [];
      result.hits.hits.forEach(function(hit){ ids.push(hit._id); });
      fbSearchResponse.child( snap.key() ).set( ids );
    }
  });
}
fbSearchRequest.on('child_added', processSearchRequest);
