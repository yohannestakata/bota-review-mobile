import Svg, { Path } from "react-native-svg";

type GoogleMarkProps = {
  size?: number;
};

export function GoogleMark({ size = 20 }: GoogleMarkProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52Z"
        fill="#4285F4"
      />
      <Path
        d="M12 22c2.7 0 4.97-.9 6.62-2.44l-3.24-2.52c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <Path
        d="M6.41 13.88A6.01 6.01 0 0 1 6.1 12c0-.65.11-1.28.31-1.88v-2.6H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.48l3.35-2.6Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 6c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.96 3.02 14.7 2 12 2a10 10 0 0 0-8.94 5.52l3.35 2.6C7.2 7.76 9.4 6 12 6Z"
        fill="#EA4335"
      />
    </Svg>
  );
}
