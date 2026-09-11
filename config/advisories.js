/**
 * How many security advisories a project published recently.
 *
 * The cached `advisory_count` is a project's whole disclosure history and
 * cannot be used as a count of anything. Two reasons.
 *
 * It is capped. ecosyste.ms returns at most 100 advisories embedded in a
 * package record, so any project with a long history reports exactly 100 and
 * the real figure is unknown. drupal/core is one of four packages in the cache
 * sitting on that ceiling.
 *
 * And it is historical. The records carry `published_at` but nothing saying
 * whether an advisory was ever fixed, so "100 known security issues" reads as
 * a hundred open holes when almost all of them were patched years ago. For a
 * project with a good security team that is precisely backwards: a long
 * advisory list is what responsible disclosure looks like, and the count grows
 * with a project's age and the quality of its process.
 *
 * A recent window avoids all of that. It says something true and useful — this
 * project is actively finding and disclosing problems — it does not saturate,
 * and it is the signal that actually bears on whether a security audit or CRA
 * readiness work would help.
 */

/** The window we report on. A year smooths out irregular disclosure cadence. */
export const RECENT_ADVISORY_MONTHS = 12;

/** How many entries a summary lists before it stops naming them individually. */
export const ADVISORY_LIST_LIMIT = 10;

function cutoff(now) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - RECENT_ADVISORY_MONTHS);
  return d;
}

/**
 * The package's advisories published inside the window, newest first.
 *
 * An advisory with no publication date is left out: it cannot be placed in the
 * window, and guessing would put undated history into a recency claim.
 */
export function recentAdvisories(pkg, now = new Date()) {
  const all = Array.isArray(pkg?.advisories) ? pkg.advisories : [];
  const since = cutoff(now);

  return all
    .filter((a) => {
      if (!a?.published_at) return false;
      const when = new Date(a.published_at);
      return !Number.isNaN(when.getTime()) && when >= since;
    })
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

export function recentAdvisoryCount(pkg, now = new Date()) {
  return recentAdvisories(pkg, now).length;
}

/** Does this package have advisories recent enough to say anything about? */
export function hasRecentAdvisories(pkg, now = new Date()) {
  return recentAdvisoryCount(pkg, now) > 0;
}

/**
 * The fact, phrased as disclosure activity rather than as a defect count.
 *
 * Returns null when there is nothing recent to report, so callers can leave the
 * fact off entirely rather than print a zero.
 */
export function recentAdvisoryLabel(pkg, now = new Date()) {
  const n = recentAdvisoryCount(pkg, now);
  if (n === 0) return null;
  return n === 1
    ? '1 security advisory published in the last year'
    : `${n} security advisories published in the last year`;
}
