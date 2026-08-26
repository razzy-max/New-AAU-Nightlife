import slugify from 'slugify';

export const slugifyTitle = (title) => slugify(String(title || ''), { lower: true, strict: true, trim: true });

export const generateUniqueSlug = async (title, EventModel, excludeId = null) => {
  const base = slugifyTitle(title) || 'event';
  let candidate = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await EventModel.findOne(query).select('_id');
    if (!existing) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter += 1;
  }
};
