const path = require('path');

const APP_NODE_MODULES = path.resolve(__dirname, 'node_modules');

module.exports = (request, options) => {
  // Force Angular, rxjs, and zone.js to resolve from app's node_modules
  // to avoid duplicate instances from shared-data-access lib
  if (
    request.startsWith('@angular/') ||
    request === 'rxjs' ||
    request.startsWith('rxjs/') ||
    request === 'zone.js' ||
    request.startsWith('zone.js/')
  ) {
    return options.defaultResolver(request, {
      ...options,
      rootDir: undefined,
      basedir: APP_NODE_MODULES,
    });
  }
  return options.defaultResolver(request, options);
};
