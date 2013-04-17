var inherits = function(constructor, superConstructor, overrides) {
  function F() {}
  F.prototype = superConstructor.prototype;
  constructor.prototype = new F();
  if(overrides) {
    for(var prop in overrides)
      constructor.prototype[prop] = overrides[prop];
  }
};
