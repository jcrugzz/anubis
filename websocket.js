import diagnostics from 'diagnostics';

//
// Setup a debug instance.
//
const debug = diagnostics('anubis:websocket');

/**
 * Interact with out WebSocket connection to handle communication between server
 * and client.
 *
 * @param {WebSocket} client Incoming WebSocket connection.
 * @private
 */
function incoming(boot) {
  /**
   * Handle incoming connections.
   *
   * @param {WebSocket} client Incoming WebSocket connection.
   * @private
   */
  return function connection(client) {
    const destiny = boot.get('destiny');

    //
    // All our supported RPC endpoints.
    //
    const endpoints = {
      'destiny.active.advisors': function advisors(data, next) {
        destiny.go(function go() {
          const active = destiny.characters.active();

          if (active) active.advisors(function advisors(err, data) {
            if (err) return next(err);

            data.type = 'advisors';
            next(undefined, data);
          });
        });
      }
    }

    //
    // Handle incoming RPC messages from the client.
    //
    client.on('message', function incoming(message) {
      let data;

      try { data = JSON.parse(message); }
      catch (e) { return debug('failed to parse message', e); }

      if (data.type === 'rpc') {
        if (data.endpoint in endpoints) {
          return endpoints[data.endpoint](data, (...args) => {
            client.send(JSON.stringify({ type: 'rpc', id: data.id, args: args }), () => {
              //
              // This flow is completely async, so it could be that by the time we
              // got our data the connection was already closed. Hence this
              // callback.
              //
            });
          });
        }

        debug('unknown rpc(%s) endpoint, for id %s', data.endpoint, data.id);
      }
    });
  }
}

export { incoming };
