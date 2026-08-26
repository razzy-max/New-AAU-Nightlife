const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export const resolveEventByIdOrSlug = (EventModel, param, selectFields) => {
  const query = OBJECT_ID_RE.test(param)
    ? EventModel.findById(param)
    : EventModel.findOne({ slug: param });
  return selectFields ? query.select(selectFields).exec() : query.exec();
};
