import QtQuick 2.7
import "qrc:/"
IGuiPage
{
	id: q16777216
	objId: 16777216
	x: 0
	y: 0
	width: 800
	height: 480
	IGuiQmlRectangle
	{
		id: q671088679
		objId: 671088679
		x: 4
		y: 176
		width: 789
		height: 298
		qm_BorderWidth: 1
		qm_TextColor: "#ff181c31"
		qm_FillColor: "#ffdedbde"
		qm_RectangleWidth: 789
		qm_RectangleHeight: 298
	}
	IGuiTextField
	{
		id: q268435493
		objId: 268435493
		x: 296
		y: 179
		width: 193
		height: 25
		qm_Transparent : true 
		qm_TextColor: "#ff31344a"
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 2
		qm_Anchors.leftMargin: 3
		qm_Anchors.rightMargin: 2
		qm_Anchors.topMargin: 2
	}
	IGuiAlarmView
	{
		id: q402653185
		objId: 402653185
		x: 4
		y: 207
		width: 789
		height: 266
		qm_BorderCornerRadius: 4
		qm_BorderWidth: 1
		qm_RectangleBorder.color:"#ff6b717b"
		qm_FillColor: "#fff7f3f7"
		IGuiListCtrl
		{
			id: qu402653185
			objectName: "qu402653185"
			x: 2
			y: 2
			width: 785
			height: 258
			qm_list.qm_linesPerRow: 1
			qm_list.qm_tableRowHeight: 18
			qm_list.qm_tableMarginLeft: 2
			qm_list.qm_tableMarginRight: 1
			qm_list.qm_tableMarginBottom: 1
			qm_list.qm_tableMarginTop: 1
			qm_list.qm_tableBackColor: "#ffffffff"
			qm_list.qm_tableSelectBackColor: "#ff94b6e7"
			qm_list.qm_tableAlternateBackColor: "#ffe7e7ef"
			qm_list.qm_tableTextColor: "#ff181c31"
			qm_list.qm_tableSelectTextColor: "#ffffffff"
			qm_list.qm_tableAlternateTextColor: "#ff181c31"
			qm_scrollCtrl: qus402653185

			qm_hasHeader: true
			qm_hasBorder: true
			qm_hasHorizontalScrollBar: false
			qm_hasVerticalScrollBar: true
			qm_list.qm_gridLineStyle: 0
			qm_list.qm_gridLineWidth: 0
			qm_list.qm_gridLineColor: "#ffffffff"
			qm_columnTypeList: [0, 0, 0, 0, 0]
			totalColumnWidth: 751
			qm_headerItem: qh402653185
			IGuiListHeader
			{
				id: qh402653185
				width: 751
				qm_listItem: qu402653185
				qm_columnWidthList: [26, 68, 96, 88, 473]
				color: "#ff84868c"
				qm_tableHeaderTextColor: "#ffffffff"
				qm_tableHeaderValueVarTextAlignmentHorizontal: Text.AlignLeft
				qm_tableHeaderValueVarTextAlignmentVertical: Text.AlignVCenter
				qm_tableHeaderMarginLeft: 3
				qm_tableHeaderMarginRight: 1
				qm_tableHeaderMarginBottom: 1
				qm_tableHeaderMarginTop: 1
				qm_noOfColumns: 5
				qm_tableHeaderHeight: 18
				qm_leftImageID: 30
				qm_leftTileTop: 4
				qm_leftTileBottom: 15
				qm_leftTileRight: 2
				qm_leftTileLeft: 4
				qm_middleImageID: 31
				qm_middleTileTop: 2
				qm_middleTileBottom: 15
				qm_middleTileRight: 2
				qm_middleTileLeft: 2
				qm_rightImageID: 32
				qm_rightTileTop: 4
				qm_rightTileBottom: 15
				qm_rightTileRight: 4
				qm_rightTileLeft: 2
				radius: 2
			}
			IGuiListScrollBarCtrl
			{
				id: qus402653185

			}
			qm_UseRowSpecificColor: true
		}
	}
	IGuiButton
	{
		id: q486539306
		objId: 486539306
		x: 13
		y: 102
		width: 93
		height: 28
		qm_BorderCornerRadius: 3
		qm_BorderWidth: 2
		qm_ImageSource: "image://QSmartImageProvider/24#2#4#128#0#0"
		qm_Border.top: 14
		qm_Border.bottom: 14
		qm_Border.right: 5
		qm_Border.left: 5
		qm_FillColor: "#ff636573"
		qm_TextColor: "#ffffffff"
		qm_ValueVarTextAlignmentHorizontal: Text.AlignHCenter
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 2
		qm_Anchors.leftMargin: 2
		qm_Anchors.rightMargin: 2
		qm_Anchors.topMargin: 2
		qm_FocusWidth: 2
		qm_FocusColor: "#ff94b6e7"
	}
	IGuiButton
	{
		id: q486539307
		objId: 486539307
		x: 12
		y: 141
		width: 93
		height: 28
		qm_BorderCornerRadius: 3
		qm_BorderWidth: 2
		qm_ImageSource: "image://QSmartImageProvider/24#2#4#128#0#0"
		qm_Border.top: 14
		qm_Border.bottom: 14
		qm_Border.right: 5
		qm_Border.left: 5
		qm_FillColor: "#ff636573"
		qm_TextColor: "#ffffffff"
		qm_ValueVarTextAlignmentHorizontal: Text.AlignHCenter
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 2
		qm_Anchors.leftMargin: 2
		qm_Anchors.rightMargin: 2
		qm_Anchors.topMargin: 2
		qm_FocusWidth: 2
		qm_FocusColor: "#ff94b6e7"
	}
	IGuiIOField
	{
		id: q33554439
		objId: 33554439
		x: 149
		y: 131
		width: 160
		height: 32
		qm_BorderCornerRadius: 3
		qm_BorderWidth: 4
		qm_ImageSource: "image://QSmartImageProvider/34#2#4#128#0#0"
		qm_Border.top: 5
		qm_Border.bottom: 5
		qm_Border.right: 5
		qm_Border.left: 5
		qm_FillColor: "#ff848284"
		qm_TextColor: "#ff31344a"
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 6
		qm_Anchors.leftMargin: 7
		qm_Anchors.rightMargin: 6
		qm_Anchors.topMargin: 6
	}
	IGuiTextField
	{
		id: q268435495
		objId: 268435495
		x: 147
		y: 95
		width: 98
		height: 23
		qm_Transparent : true 
		qm_TextColor: "#ff31344a"
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 2
		qm_Anchors.leftMargin: 3
		qm_Anchors.rightMargin: 2
		qm_Anchors.topMargin: 2
	}
	IGuiQmlCircle
	{
		id: q671088676
		objId: 671088676
		x: 674
		y: 121
		width: 48
		height: 48
		qm_BorderWidth: 1
		qm_TextColor: "#ff181c31"
		qm_FillColor: "#ffdedbde"
		qm_Radius : 24
		qm_EllipseWidth: 48
		qm_EllipseHeight: 48
	}
	IGuiTextField
	{
		id: q268435496
		objId: 268435496
		x: 620
		y: 94
		width: 165
		height: 23
		qm_Transparent : true 
		qm_TextColor: "#ff31344a"
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 2
		qm_Anchors.leftMargin: 3
		qm_Anchors.rightMargin: 2
		qm_Anchors.topMargin: 2
	}
	IGuiButton
	{
		id: q486539311
		objId: 486539311
		x: 392
		y: 131
		width: 202
		height: 32
		qm_BorderCornerRadius: 3
		qm_BorderWidth: 2
		qm_ImageSource: "image://QSmartImageProvider/24#2#4#128#0#0"
		qm_Border.top: 15
		qm_Border.bottom: 15
		qm_Border.right: 5
		qm_Border.left: 5
		qm_FillColor: "#ff636573"
		qm_TextColor: "#ffffffff"
		qm_ValueVarTextAlignmentHorizontal: Text.AlignHCenter
		qm_ValueVarTextAlignmentVertical: Text.AlignVCenter
		qm_Anchors.bottomMargin: 2
		qm_Anchors.leftMargin: 2
		qm_Anchors.rightMargin: 2
		qm_Anchors.topMargin: 2
		qm_FocusWidth: 2
		qm_FocusColor: "#ff94b6e7"
	}
}
