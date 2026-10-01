#!/usr/bin/env python3
"""Render a 20K MODE 2 screen dump as text, one hex digit per pixel.

Usage: python3 tools/screen.py shots/screen.bin [first_row] [last_row] [first_x] [last_x]

Logical colour 0 prints as '.', so the sky drops out and what is left is the
terrain, the tanks and whatever else got drawn. Rows that are entirely colour
0 are skipped.
"""
import sys

DIGITS = ".123456789ABCDEF"


def pixel(data, x, y):
    b = data[(y // 8) * 640 + (x // 2) * 8 + (y % 8)]
    if x & 1:
        b <<= 1
    # MODE 2 interleaves the two pixels: the left one's bits are 7,5,3,1.
    return ((b >> 4) & 8) | ((b >> 3) & 4) | ((b >> 2) & 2) | ((b >> 1) & 1)


def main():
    data = open(sys.argv[1], "rb").read()
    first = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    last = int(sys.argv[3]) if len(sys.argv) > 3 else 255
    x0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    x1 = int(sys.argv[5]) if len(sys.argv) > 5 else 159
    for y in range(first, min(last + 1, 256)):
        line = "".join(DIGITS[pixel(data, x, y)] for x in range(x0, x1 + 1))
        if line.strip("."):
            print(f"{y:3d} |{line}|")


main()
