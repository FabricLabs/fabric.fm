var config = require('./config');

var Maki = require('maki');
var fabric = new Maki(config);

var Sessions = require('maki-sessions');
var sessions = new Sessions();

fabric.use(sessions);

// setup of various remotes, subservices on another Maki namespace
var Remote = require('maki-remote');
var MailPimpSubscription = new Remote('http://localhost:2525/subscriptions');
var MailPimpTask = new Remote('http://localhost:2525/tasks');

var Subscription = fabric.define('Subscription', {
  attributes: {
    email: { type: String , required: true , validator: function(value) {
      // see HTML spec: https://html.spec.whatwg.org/multipage/forms.html#valid-e-mail-address
      // this should mirror HTML5's "type=email", as per the above link
      return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test( value );
    } },
    status: { type: String , enum: ['requested', 'pending', 'validated'], default: 'requested' },
    created: { type: Date , default: Date.now },
  },
  handlers: {
    html: {
      create: function(req, res, next) {
        req.flash('info', 'Successfully subscribed!  Check your inbox for a confirmation.');
        res.redirect('/');
      }
    }
  }
});

Subscription.post('create', function(done) {
  var subscription = this;
  MailPimpSubscription.create({
    email: subscription.email,
    // TODO: place in config, or auto-create-and-collect
    _list: '55d60facb4f5b05239ef6763'
  }, function(err, data) {
    // TODO: retry, error handling, etc.
    if (!data._id) return done('no subscription created');
    Subscription.patch({ _id: subscription._id }, [
      { op: 'replace', path: '/status', value: 'pending' }
    ], function(err) {
      if (err) console.error(err);
      done(err);
    });
  });
});

fabric.start(function() {
  fabric.app.post('/contact', function(req, res, next) {
    MailPimpTask.create({
      subject: 'fabric.fm Contact Form',
      recipient: 'eric@fabric.fm',
      sender: req.param('from'),
      content: req.param('message')
    }, function(err, task) {
      req.flash('info', 'Mail sent successfully!  We\'ll get in touch shortly.');
      res.redirect('/');
    });
  });
});
