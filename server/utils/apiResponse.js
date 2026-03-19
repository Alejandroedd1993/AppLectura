export function buildSuccessPayload(data, extra = {}) {
  return {
    ok: true,
    data,
    ...extra
  };
}

export function sendSuccess(res, data, extra = {}, status = 200) {
  return res.status(status).json(buildSuccessPayload(data, extra));
}