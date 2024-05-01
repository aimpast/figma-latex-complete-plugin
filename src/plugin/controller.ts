figma.showUI(__html__);

const postSourceCode = () => {
    const selection = figma.currentPage.selection;
    if (selection.length !== 0) {
        const source = selection[0].getPluginData('source');
        figma.ui.postMessage({type: 'source', value: source});
    }
};
postSourceCode();

const adjustTextNodeSize = (node: SceneNode) => {
    if (node.type === 'TEXT') {
        // テキストの内容に基づいて幅を計算
        //node.resizeWithoutConstraints(node.width, node.fontSize as number);
        node.resize(node.width / 4, 5);
        // 高さを1行分に設定
        //node.textAutoResize = 'HEIGHT';  // テキストの高さを自動調整
    }
    // グループ内の子ノードも再帰的に調整
    if ('children' in node) {
        node.children.forEach(child => adjustTextNodeSize(child));
    }
};

function alignBottom(groupNode: GroupNode) {
    groupNode.children.forEach(child => {
        child.y = 0;
    });
}

figma.ui.onmessage = async msg => {
    if (msg.type === 'create-latex-svg') {
        const node = figma.createNodeFromSvg(msg.svg);
        if (node.children.length !== 0) {
            const svg = <GroupNode>node.children[0];
            await figma.loadFontAsync({family: 'Inter', style: 'Regular'});
            adjustTextNodeSize(node);
            alignBottom(svg.children[0] as GroupNode);

            const selection = figma.currentPage.selection;
            (svg as any).setRelaunchData({edit: ''});
            //svg.resize(msg.scale, svg.height * (msg.scale / svg.width));
            svg.resize(svg.width * 4, svg.height * 4);
            if (selection.length !== 0 && selection[0].getPluginData('source') != '') {
                const groupNode = <GroupNode>selection[0];
                groupNode.setPluginData('source', msg.source);
                groupNode.name = msg.source;
                svg.x = groupNode.x;
                svg.y = groupNode.y;
                groupNode.appendChild(svg.children[0]);
                groupNode.children[0].remove();
                figma.currentPage.selection = [groupNode];
            } else {
                svg.setPluginData('source', msg.source);
                svg.name = msg.source;
                const {x, y} = figma.viewport.center;
                svg.x = x;
                svg.y = y;
                figma.currentPage.appendChild(svg);
                figma.currentPage.selection = [svg];
            }
        }
        node.remove();
    }

    figma.closePlugin();
};
