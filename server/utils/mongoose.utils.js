/**
 * Reads a field from either a normal document context or a Mongoose update-query context.
 *
 * Mongoose validators can run with `this` pointing to a document during saves,
 * but during update operations like `findOneAndUpdate()` it behaves like a query.
 * Using `this.get()` keeps validators working in both cases.
 */
const getContextValue = (ctx, key) => {
  if (ctx && typeof ctx.get === "function") {
    return ctx.get(key);
  }

  return ctx ? ctx[key] : undefined;
};

module.exports = {
  getContextValue,
};
