var passport = require('passport');
var SoundCloudStrategy = require('passport-soundcloud').Strategy;

function PassportSoundcloud( config ) {
  if (!config) var config = {};

  var self = this;
  self.config = config;

  if (!config.fields) config.fields = {};

  config.fields.username = config.fields.username || 'username';

  var resources = {};
  if (self.config.resource) {
    resources[ self.config.resource ] = {
      plugin: function(schema, options) {

      }
    };
  }

  self.extends = {
    resources: resources,
    services: {
      http: {
        middleware: function(req, res, next) {
          return next();
        },
        setup: function( maki ) {

          var strategy = new SoundCloudStrategy({
            clientID: maki.config.soundcloud.id,
            clientSecret: maki.config.soundcloud.secret,
            callbackURL: 'https://' + maki.config.service.authority + '/auth/soundcloud/callback',
            passReqToCallback: true
          }, verifyUser );

          maki.passport.use( strategy );

          function verifyUser(req, accessToken, refreshToken, profile, done) {

            console.log('profile:', profile);

            var Resource = maki.resources[ self.config.resource ];
            // TODO: use provided path (i.e., configurable profile storage)
            Resource.get({ 'profiles.soundcloud.id': profile.id }, function(err, user) {
              if (err) return done(err);

              if (req.user) {
                // TODO: use real Maki methods
                Resource.Model.update({ _id: req.user._id }, {
                  $addToSet: {
                    'profiles.soundcloud': {
                      id: profile.id,
                      username: profile._json.username,
                      token: accessToken
                    }
                  }
                }).exec(function(err) {
                  if (err) {
                    req.flash('error', err);
                  }
                  req.flash('success', 'Soundcloud profile authorized successfully!');
                  return done( err , req.user );
                });
              } else {
                return done( null , false , { message: 'Invalid login.' } );
              }

            });
          }

          maki.app.get('/auth/soundcloud', maki.passport.authenticate('soundcloud', {
            scope: 'non-expiring'
          }) );
          maki.app.get('/auth/soundcloud/callback', maki.passport.authenticate('soundcloud'), function(req, res) {
            return res.redirect('/');
          });

          maki.passport.serializeUser(function(user, done) {
            done( null , user._id );
          });
          maki.passport.deserializeUser(function(id, done) {
            maki.resources[ self.config.resource ].get({ _id: id }, done );
          });

        }
      }
    }
  };

  return self;
}

module.exports = PassportSoundcloud;
