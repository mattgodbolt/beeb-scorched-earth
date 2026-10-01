# SCORCHED EARTH — BBC Micro
#
#   make          assemble build/scorch.ssd
#   make run      boot it in jsbeeb and grab a screenshot
#   make test     four computer players fight a 3-round game; fails on a BRK
#   make ship     copy the built disc to scorched-earth.ssd, the one the README links

BARON   ?= $(firstword $(wildcard ../baron/build/src/baron) baron)
TARGET   = build/scorch.ssd
SYMBOLS  = build/symbols.json
SOURCES  = $(wildcard src/*.6502)

.PHONY: all run test ship clean

all: $(TARGET)

# The symbol dump is how the test tools find the game's variables.
$(TARGET): $(SOURCES) | build
	$(BARON) -o $(TARGET) --title SCORCHED --opt 3 --symbols $(SYMBOLS) -v -log0 build/listing.txt src/main.6502
	@grep -E '^code' build/listing.txt || true

build:
	mkdir -p build

run: $(TARGET)
	node tools/play.mjs '5,!run' shots/

test: $(TARGET)
	node tools/soak.mjs 3 6

ship: $(TARGET)
	cp $(TARGET) scorched-earth.ssd

clean:
	rm -rf build
