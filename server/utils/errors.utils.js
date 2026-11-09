// Raw error messages can contain database, collection, index and model names or library internals,
// so clients only ever get these safe messages. The real error is logged on the server.
const INTERNAL_ERROR = "Internal server error";

// Errors the client caused (bad or duplicate data) get a 400/409 with a safe message; anything else is null
const clientError = (error) => {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || "value";
    return { status: 409, message: `That ${field} is already in use` };
  }
  if (error?.name === "ValidationError")
    return {
      status: 400,
      message: Object.values(error.errors || {}).map((fieldError) => fieldError.message).join(" "),
    };
  if (error?.name === "CastError")
    return { status: 400, message: `Invalid ${error.path}` };
  return null;
};

module.exports = { INTERNAL_ERROR, clientError };
