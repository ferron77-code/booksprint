# -*- coding: utf-8 -*-
"""The photographed projects and the renderings, in one place.

Two pages name these: the portfolio grid, and the carousel on the homepage.
They held separate copies of the same nine titles, which is how the homepage
still said "Specimen Palm Uplighting" and "Parking Deck Retrofit" a fortnight
after the portfolio page stopped — the client read the two side by side and
reported exactly that. One list now, imported by both, so they cannot drift
apart again.

Names describe the photograph. That is the whole rule: no invented project
identities, and no claim about how a job was executed that is not visible in
the frame. Where the client's vocabulary and the trade's disagree, the
client's wins — the fixtures at the base of the palm and the garden wall are
in-ground, so neither is called uplighting, and a covered multi-storey
structure is a garage here, not a deck.
"""



# slug, filter keys, kind label, title, blurb
#
# Rewritten 2026-08-26. The names and blurbs used to describe a job rather
# than the photograph: invented project identities ("Estate Garden",
# "Grounds"), and claims about how each install was executed — fixture
# counts, aiming, spacing, whether the system was sized to hold output at
# the end of the run. None of that is visible in the frame and none of it
# can be checked, which is exactly what the client meant by the names and
# descriptions not matching. Every row below now says what is in the picture
# and stops there.
REAL = [
    ("walls",    "lighting residential landscape", "Residential &middot; Landscape",
     "Garden Wall Lighting",
     "A run of sculptural garden wall panels, each one lit from the grass at its base. Light thrown up a flat surface from this close shows every difference in aim, so the panels are what the eye checks first."),
    ("palm",     "lighting residential landscape", "Residential &middot; Landscape",
     "Palm &amp; Landscape Lighting",
     "The same garden looking the other way, with a mature date palm lit from in-ground fixtures at its base, set to carry the trunk and reach the crown."),
    ("hedge",    "lighting residential property landscape", "Residential &middot; Landscape",
     "Hedge Line &amp; Lawn",
     "A hedge run lit from in front along the edge of a lawn, photographed just after sunset while there is still color in the sky."),
    ("pool",     "lighting residential", "Residential &middot; Exterior",
     "Pool &amp; Covered Terrace",
     "Pool, hedge and covered terrace lit as three separate layers, so the terrace stays the brightest thing and the planting behind it holds the edge of the garden."),
    ("interior", "lighting residential", "Residential &middot; Interior",
     "Kitchen Pendants &amp; Coves",
     "Three decorative pendants over the island doing the visual work, with cove and recessed lighting carrying the actual light level. Warm throughout."),
    ("lot",      "lighting commercial property", "Commercial &middot; Exterior",
     "Office Building &amp; Parking Lot",
     "A two-story office building and its lot after dark, from the air. Building, entrance, drive and parking bays are all lit, which is what the property looks like to anyone arriving in the evening."),
    ("deck",     "lighting commercial property", "Commercial &middot; Parking",
     "Parking Garage",
     "Linear fixtures running down the drive lane of a parking garage and across the bays either side of it."),
    ("deck-wide","lighting commercial property", "Commercial &middot; Parking",
     "Parking Garage Drive Lane",
     "A larger garage, lit down the length of the drive lane. Floor markings and column striping carry as much of the safety job here as the fixtures do."),
    ("planting", "lighting residential landscape", "Residential &middot; Landscape",
     "Planting Bed &amp; Palms",
     "Low fixtures inside a planting bed picking out leaf texture, with the palms behind it lit so the trunks and canopy read against the night rather than disappearing into it."),
    ("highbay",  "lighting commercial property", "Commercial &middot; Interior",
     "High-Bay Lighting",
     "Rows of round high-bay pendants over an open commercial floor, hung at a consistent height so the light lands evenly across the whole space."),
]

CONCEPT = [
    ("medical", "buildout commercial", "Commercial &middot; Buildout", "Medical Office Fit-Out",
     "Exam rooms, corridors and a waiting area from bare shell to open practice. Color rendering and glare control are clinical requirements here, not preferences."),
    ("groundup", "buildout commercial", "Commercial &middot; Buildout", "Two-Story Commercial Shell",
     "Slab, structure, envelope and fit-out on one contract, then the facade wash, canopy and parking light that decide how it reads at seven. The building and the lighting are the same job, which is why the fixtures are laid out while the walls are still open."),
    ("estate",  "lighting residential landscape", "Residential &middot; Landscape", "Estate Uplighting",
     "Facade grazing, tree uplighting and path lighting across the front of a house, with the drive and planting held at a lower level than the building itself."),
    ("garage",  "lighting commercial property", "Commercial &middot; Parking", "Parking Structure Retrofit",
     "A garage relit end to end. The argument for a retrofit is rarely the energy model &mdash; it is walking a resident through at nine at night."),
    ("court",   "lighting residential exterior", "Residential &middot; Exterior", "Court &amp; Grounds Lighting",
     "Even light across a playing surface with the spill kept off the boundary, so the neighbors keep their night sky and the grounds still read as landscape."),
]

