import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { DEFAULT_TURF_IMAGE } from '../constants/defaultImages';

/** Image that swaps to the bundled default turf photo when the URL is empty or fails to load. */
export const SafeImage = ({ uri, style, resizeMode = 'cover', ...rest }) => {
    const [failed, setFailed] = useState(false);
    useEffect(() => { setFailed(false); }, [uri]);
    return (
        <Image
            {...rest}
            source={failed || !uri ? DEFAULT_TURF_IMAGE : { uri }}
            style={style}
            resizeMode={resizeMode}
            onError={() => setFailed(true)}
        />
    );
};

export default SafeImage;
