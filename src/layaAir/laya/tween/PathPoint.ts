
export enum CurveType {
    /**
     * @en Curve type: Cardinal spline.
     * @zh 曲线类型：基数样条。
     */
    CRSpline,
    /**
     * @en Curve type: Bezier curve.
     * @zh 曲线类型：贝塞尔曲线。
     */
    Bezier,
    /**
     * @en Curve type: Cubic Bezier curve.
     * @zh 曲线类型：三次贝塞尔曲线。
     */
    CubicBezier,
    /**
     * @en Curve type: Straight line.
     * @zh 曲线类型：直线。
     */
    Straight
}

export class PathPoint {
    /**
     * @en X axis value.
     * @zh X 轴坐标。
     */
    x: number = 0;
    /**
     * @en Y axis value.
     * @zh Y 轴坐标。
     */
    y: number = 0;

    /**
     * @en Control point 1 X axis value.
     * @zh 控制点1的 X 轴坐标。
     */
    c1_x: number = 0;
    /**
     * @en Control point 1 Y axis value.
     * @zh 控制点1的 Y 轴坐标。
     */
    c1_y: number = 0;

    /**
     * @en Control point 2 X axis value.
     * @zh 控制点2的 X 轴坐标。
     */
    c2_x: number = 0;
    /**
     * @en Control point 2 Y axis value.
     * @zh 控制点2的 Y 轴坐标。
     */
    c2_y: number = 0;

    /**
     * @en Curve type.
     * @zh 曲线类型。
     */
    curve: number = 0;

    /**
     * @en Create a cardinalspline curve point.
     * @param x X axis value.
     * @param y Y axis value. 
     * @param curveType Curve type. 
     * @returns A new instance of PathPoint.
     * @zh 创建一个 PathPoint 的实例。
     * @param x X 轴坐标。
     * @param y Y 轴坐标。
     * @param curveType 曲线类型。
     * @returns PathPoint 实例。 
     */
    static newPoint(x: number, y: number, curveType: number): PathPoint {
        let pt = new PathPoint();
        pt.x = x || 0;
        pt.y = y || 0;
        pt.c1_x = 0;
        pt.c1_y = 0;
        pt.c2_x = 0;
        pt.c2_y = 0;
        pt.curve = curveType || CurveType.CRSpline;

        return pt;
    }

    /**
     * @en Create a bezier curve point.
     * @param x X axis value. 
     * @param y Y axis value. 
     * @param control1_x Control point 1 X axis value. 
     * @param control1_y Control point 1 Y axis value. 
     * @returns A new instance of PathPoint. 
     * @zh 创建一个贝塞尔曲线点。
     * @param x X 轴坐标。
     * @param y Y 轴坐标。
     * @param control1_x 控制点1的 X 轴坐标。
     * @param control1_y 控制点1的 Y 轴坐标。
     * @returns PathPoint 实例。
     */
    static newBezierPoint(x: number, y: number, control1_x: number, control1_y: number): PathPoint {
        let pt = new PathPoint();
        pt.x = x || 0;
        pt.y = y || 0;
        pt.c1_x = control1_x || 0;
        pt.c1_y = control1_y || 0;
        pt.c2_x = 0;
        pt.c2_y = 0;
        pt.curve = CurveType.Bezier;

        return pt;
    }

    /**
     * Create a cubic bezier curve point.
     * @param x X axis value.
     * @param y Y axis value.
     * @param control1_x Control point 1 X axis value.
     * @param control1_y Control point 1 Y axis value. 
     * @param control2_x Control point 2 X axis value. 
     * @param control2_y Control point 2 Y axis value. 
     * @returns A new instance of PathPoint.
     * @zh 创建一个三次贝塞尔曲线点。
     * @param x X 轴坐标。
     * @param y Y 轴坐标。
     * @param control1_x 控制点1的 X 轴坐标。
     * @param control1_y 控制点1的 Y 轴坐标。
     * @param control2_x 控制点2的 X 轴坐标。
     * @param control2_y 控制点2的 Y 轴坐标。
     * @returns PathPoint 实例。
     */
    static newCubicBezierPoint(x: number, y: number, control1_x: number, control1_y: number,
        control2_x: number, control2_y: number): PathPoint {
        let pt = new PathPoint();
        pt.x = x || 0;
        pt.y = y || 0;
        pt.c1_x = control1_x || 0;
        pt.c1_y = control1_y || 0;
        pt.c2_x = control2_x || 0;
        pt.c2_y = control2_y || 0;
        pt.curve = CurveType.CubicBezier;

        return pt;
    }

    /**
     * @en Clone a new PathPoint.
     * @returns A new instance of PathPoint.
     * @zh 克隆一个新的 PathPoint。
     * @returns PathPoint 实例。 
     */
    clone(): PathPoint {
        let pt = new PathPoint();
        pt.x = this.x;
        pt.y = this.y;
        pt.c1_x = this.c1_x;
        pt.c1_y = this.c1_y;
        pt.c2_x = this.c2_x;
        pt.c2_y = this.c2_y;
        pt.curve = this.curve;

        return pt;
    }
}